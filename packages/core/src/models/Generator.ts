import path, { resolve, join } from "path";
import generator from "@babel/generator";
import fs from "fs-extra";
import chalk from "chalk";
import { parse } from "@babel/parser";

import { relativePathToRoot } from "../utils/constants";
import { createFiles } from "../utils/createFiles";
import { createConfigByParseAst } from "../utils/ast/parseAst";
import { Preset } from "../utils/preset";
import { readTemplateFileContent } from "../utils/fileController";
import generateBuildToolConfigFromEJS from "../utils/generateBuildToolConfigFromEJS";
import { buildToolType } from "../types";

import GeneratorAPI from "./GeneratorAPI";
import ConfigTransform from "./ConfigTransform";
import TemplateAPI from "./TemplateAPI";
import FileTree from "./FileTree";
import BaseAPI from "./BaseAPI";

interface ConfigFileData {
  file: Record<string, string[]>;
}

/**
 * @description 为文件内容添加换行符
 * @param str 文件内容
 * @returns 末尾添加换行符后的文件内容
 */
const ensureEOL = (str: string) => {
  if (str.charAt(str.length - 1) !== "\n") {
    return str + "\n";
  }
  return str;
};

// 提前预置的插件对应的配置文件清单
const defaultConfigTransforms = {
  swc: new ConfigTransform({
    file: {
      json: [".swcrc"],
    },
  }),
  babel: new ConfigTransform({
    file: {
      js: ["babel.config.js"],
    },
  }),
  postcss: new ConfigTransform({
    file: {
      js: ["postcss.config.js"],
      json: [".postcssrc.json", ".postcssrc"],
      yaml: [".postcssrc.yaml", ".postcssrc.yml"],
    },
  }),
  eslint: new ConfigTransform({
    file: {
      js: [".eslintrc.js"],
      json: [".eslintrc", ".eslintrc.json"],
      yaml: [".eslintrc.yaml", ".eslintrc.yml"],
    },
  }),
  browserslist: new ConfigTransform({
    file: {
      lines: [".browserslistrc"],
    },
  }),
  "lint-staged": new ConfigTransform({
    file: {
      js: ["lint-staged.config.js"],
      json: [".lintstagedrc", ".lintstagedrc.json"],
      yaml: [".lintstagedrc.yaml", ".lintstagedrc.yml"],
    },
  }),
  prettier: new ConfigTransform({
    file: {
      json: [".prettierrc"],
    },
  }),
};

/**
 * Vue项目的配置对象。
 * @typedef {Object} VueConfigTransform
 * @property {Object} file - 文件配置。
 * @property {string[]} file.js - JavaScript配置文件的文件名数组。
 */
const reservedConfigTransforms = {
  vue: new ConfigTransform({
    file: {
      js: ["vue.config.js"],
    },
  }),
};

/**
 * 根据传入的路径加载模块并返回。
 * @async
 * @function loadModule
 * @param {string} modulePath - 要加载的模块路径。
 * @param {string} rootDirectory - 根目录路径。
 * @returns {Promise<any>} 返回一个 Promise 对象，该对象在成功时解析为加载的模块，失败时解析为 null。
 */
async function loadModule(modulePath: string, rootDirectory: string) {
  /**
   * 解析后的路径。
   * @type {string}
   */
  const resolvedPath = path.resolve(rootDirectory, modulePath);
  try {
    const module = await require(resolvedPath);
    return module;
  } catch (error) {
    console.error(`Error loading module at ${resolvedPath}:`, error);
    return null;
  }
}

/**
 * @description 生成器，实现插件的文件注入、配置拓展
 */
class Generator {
  private rootDirectory: string;
  private plugins: Record<string, any>;
  private files: FileTree; // 键：文件名，值：文件内容
  private rootOptions: Record<string, any> = {};
  private configTransforms: Record<string, ConfigTransform> = {};
  private defaultConfigTransforms: Record<string, ConfigTransform>;
  private reservedConfigTransforms: Record<string, ConfigTransform>;
  public pkg: object; // 执行generatorAPI之后带有key值为plugin
  public originalPkg: object; // 原始package.json
  public templateName: string; // 需要拉取的模板名称
  public buildTool: buildToolType; // 构建工具名称
  public buildToolConfigAst; // 构建工具配置文件语法树
  public buildToolConfig;
  private generatorAPI: GeneratorAPI;
  private templateAPI: TemplateAPI;
  private preset: Preset;

  constructor(
    rootDirectory: string,
    plugins = {},
    pkg = {},
    templateName: string,
    buildTool: buildToolType,
    preset: Preset,
  ) {
    this.rootDirectory = rootDirectory;
    this.plugins = plugins;
    this.defaultConfigTransforms = defaultConfigTransforms;
    this.reservedConfigTransforms = reservedConfigTransforms;
    this.originalPkg = pkg;
    this.pkg = Object.assign({}, pkg);
    this.templateName = templateName;
    this.buildTool = buildTool;
    this.files = new FileTree(this.rootDirectory);
    this.generatorAPI = new GeneratorAPI(this);
    this.templateAPI = new TemplateAPI(this);
    this.preset = preset;
  }

  // 根据环境变量加载 plugin/template
  async loadBase(
    pkgPath: string,
    modulePath: string,
  ): Promise<(api: BaseAPI, template?: string) => Promise<any>> {
    let baseGenerator: (api: BaseAPI, template?: string) => Promise<any>;
    if (process.env.NODE_ENV === "DEV") {
      const basePathInDev = pkgPath;
      baseGenerator = await loadModule(basePathInDev, path.resolve(__dirname, relativePathToRoot));
    } else if (process.env.NODE_ENV === "PROD") {
      if (modulePath !== "") {
        const basePathInProd = modulePath;
        baseGenerator = await loadModule(basePathInProd, this.rootDirectory);
      }
    } else {
      throw new Error("NODE_ENV is not set");
    }
    return baseGenerator;
  }

  // 借助ast合并构建工具配置
  // 主要用于一些插件以及模板可能需要对构建工具做一些配置，该方法就是获取插件或模板相关文件中的配置与模板ast进行合并
  // 最后将ast生成代码放到相关文件中插入到根目录
  async mergeBuildToolConfigByAst(entryPath: string) {
    // 执行 plugin或模板的入口文件，把 config 合并到构建工具原始配置中
    const baseEntry = await loadModule(entryPath, path.resolve(__dirname, relativePathToRoot));

    // 处理构建工具配置
    if (typeof baseEntry === "function") {
      // 解析配置项成 ast 语法树,并且和原始配置的 ast 合并
      createConfigByParseAst(
        this.buildTool,
        baseEntry(this.buildTool, this.templateName),
        this.buildToolConfigAst,
      );
    }
  }

  // 单独处理一个插件相关文件
  async pluginGenerate(pluginName: string) {
    const pluginGenerator = await this.loadBase(
      `packages/@plugin/plugin-${pluginName}/generator/index.cjs`,
      `node_modules/${pluginName}-plugin-test-ljq`,
    );

    if (pluginGenerator && typeof pluginGenerator === "function") {
      await pluginGenerator(this.generatorAPI, this.templateName);
    }

    const templatePath = resolve(
      __dirname,
      relativePathToRoot,
      `packages/@plugin/plugin-${pluginName}/generator/template`,
    );

    if (fs.existsSync(templatePath)) {
      // 将文件添加到根文件树对象中,最后一起生成
      this.files.addToTreeByTemplateDirPath(templatePath, this.rootDirectory);
      // new FileTree(templatePath).renderTemplates(this.rootDirectory);
    }

    // 如果插件有在构建工具配置文件中插入特有配置的需求，需要调用该函数借助ast进行插入
    await this.mergeBuildToolConfigByAst(`packages/@plugin/plugin-${pluginName}/index.cjs`);
  }

  // 单独处理一个框架相关依赖，主要是将框架相关的依赖包插入到pkg内，以及将需要的构建工具配置合并到构建工具模板中
  async templateGenerate() {
    const templateGenerator = await this.loadBase(
      `packages/core/template/template-${this.templateName}/generator/index.cjs`,
      "",
    );

    if (templateGenerator && typeof templateGenerator === "function") {
      // 将框架需要的依赖加入到package.json中
      await templateGenerator(this.templateAPI);
    }
  }

  // 单独处理一个构建工具相关的依赖，将构建工具相关的依赖插入到package.json中
  async buildToolGenerator() {
    const buildGenerator = await this.loadBase(
      `packages/core/template/template-${this.buildTool}-script/generator/index.cjs`,
      "",
    );

    if (buildGenerator && typeof buildGenerator === "function") {
      // 将框架需要的依赖加入到package.json中
      await buildGenerator(this.generatorAPI, this.templateName);
    }
  }

  // 创建所有 plugin 和 template 的相关文件
  async generate({ extraConfigFiles }) {
    // 判断并设置 ts 环境变量
    if (Object.keys(this.plugins).includes("typescript")) {
      process.env.isTs = "true";
    }

    // 获取构建工具配置文件ast语法树
    const buildToolConfigEjsContent = readTemplateFileContent(`${this.buildTool}.config.js`);
    // 借助ejs.render对ejs字符串文件进行渲染
    const templateOptions = {
      framework: this.templateName,
      bundler: this.buildTool,
      language: "typescript" in this.plugins ? "typescript" : "javascript",
      plugin: "scss" in this.preset.plugins ? "scss" : "",
      VueEjs: {
        useElementPlus: !!this.preset.plugins["element-plus"],
      },
    };
    const ejsResolver = generateBuildToolConfigFromEJS(templateOptions, buildToolConfigEjsContent);
    // 对解析出来的文件生成初始ast语法树，用于后续合并配置并生成真是的构建工具配置文件
    this.buildToolConfigAst = parse(ejsResolver, {
      sourceType: "module",
      ranges: true,
      tokens: true,
    });

    // 根据构建工具拉取相应的脚本执行文件
    const buildToolScriptPath = path.resolve(
      __dirname,
      "../../template/",
      `./template-${this.buildTool}-script/generator/template`,
    );
    this.files.addToTreeByTemplateDirPath(buildToolScriptPath, this.rootDirectory);

    // 根据选择的框架拉取模板进行渲染
    const templatePath = join(
      __dirname,
      "../../template/",
      `template-${this.templateName}/generator/template`,
    );
    // TODO: 此处的 ejs 渲染配置是测试用数据，实际应用中需要根据使用不同的模板进行具体的配置，具体如何实现 options 的集中管理有待商榷
    const options = {
      packageEjs: {
        name: `template-${this.templateName}`,
        version: "0.1.0",
      },
      VueEjs: {
        name: "vue_test",
        data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        usePinia: !!this.preset.plugins["pinia"],
      },
      ReactEjs: {
        useReactRouter: !!this.preset.plugins["react-router"],
      },
    };

    this.files.addToTreeByTemplateDirPathAndEjs(templatePath, this.rootDirectory, options);

    // 为每个 plugin 创建 GeneratorAPI 实例，调用插件中的 generate
    for (const pluginName of Object.keys(this.plugins)) {
      await this.pluginGenerate(pluginName);
    }

    // 将框架需要的依赖添加到package.json中，以及如果该框架如果需要添加构建工具配置属性，则借助ast进行添加
    await this.templateGenerate();

    // 将构建工具需要的依赖添加到package.json中
    await this.buildToolGenerator();

    // 与构建工具有关的配置全部添加完毕，生成构建工具配置文件
    const buildConfigFinalContent = generator(this.buildToolConfigAst).code;
    // 将构建工具配置文件也添加到根文件树对象中
    const buildToolConfigName = `${this.buildTool}.config.js`;
    this.files.addToTreeByFile(buildToolConfigName, buildConfigFinalContent);

    // 从package.json中生成额外的的文件(如果extraConfigFiles为true时需要)
    await this.extractConfigFiles(extraConfigFiles);
    // 重写package.json文件，并向根文件树中添加该文件，消除generatorAPI中拓展package.json带来得副作用
    this.files.addToTreeByFile("package.json", JSON.stringify(this.pkg, null, 2));

    // 经过以上步骤需要新增或修改的文件已经都添加到根文件树对象中,统一渲染根文件树对象中的内容
    await this.files.renderAllFiles(this.rootDirectory);

    console.log(chalk.green("💘 Files have been generated and written to disk."));
  }

  /**
   * @description 提取配置文件到files文件对象中
   */
  async extractConfigFiles(extraConfigFiles) {
    // 将所有的配置项合并到ConfigTransforms中
    const ConfigTransforms = Object.assign(
      this.configTransforms,
      this.defaultConfigTransforms,
      this.reservedConfigTransforms,
    );

    const extra = async (key: string) => {
      if (
        ConfigTransforms[key] !== undefined &&
        this.pkg[key] !== undefined &&
        // do not extract if the field exists in original package.json
        this.originalPkg[key] === undefined
      ) {
        // this.pkg[key]存在而originalPkg[key]不存在，说明该配置文件是再执行generatorAPI之后添加到pkg中得，需要生成额外的配置文件
        // 并且再添加到this.files中后需要再pkg中删除该属性
        const value = this.pkg[key];
        const configTransform = ConfigTransforms[key];
        // 转换生成文件内容
        const res = configTransform.transform(value, this.files, this.rootDirectory);
        const { content, filename } = res;
        delete this.pkg[key];
        this.files.addToTreeByFile(filename, ensureEOL(content));
        // 生成插件配置文件
        await createFiles(this.rootDirectory, {
          [filename]: ensureEOL(content),
        });
      }
    };
    if (extraConfigFiles) {
      // 用户选择In dedicated config files(true)时，为插件生成单独的配置文件
      for (const pluginName of Object.keys(this.plugins)) {
        extra(pluginName.toLowerCase());
      }
    } else {
      // always extract babel.config.js or swc.config.js as this is the only way to apply
      extra("babel");
      extra("swc");
    }
  }

  /**
   * @description 扩展配置文件
   */
  async extendConfigFile(fileName: string, data: ConfigFileData) {
    if (!this.configTransforms[fileName]) {
      this.configTransforms[fileName] = new ConfigTransform(data);
    } else {
      // 如果已经存在该配置文件，则合并其file字段
      this.configTransforms[fileName].extend(data);
    }
  }

  /**
   * 添加或更新文件
   * @param {string} path 文件路径
   * @param {string} content 文件内容
   */
  addFile(path: string, content: string) {
    this.files[path] = content;
  }

  /**
   * @description 获取到 rootDirectory 路径
   * @returns rootDirectory 路径
   */
  getRootDirectory(): string {
    return this.rootDirectory;
  }
  /**
   * 返回用户预设
   * @returns
   */
  getPreset(): Preset {
    return this.preset;
  }

  /**
   * 返回生成器文件树 （文件树的构建是分步骤的，有时候拿到的不一定是最终的文件树）
   * @returns
   */
  getFiles(): FileTree {
    return this.files;
  }

  /**
   * 返回生成器插件
   * @returns
   */
  getPlugins(): Record<string, any> {
    return this.plugins;
  }
}

export default Generator;
