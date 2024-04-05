// Generator.ts
import path from "path";

import { createFiles } from "./createFiles";
import GeneratorAPI from "./GeneratorAPI";

async function loadModule(modulePath, cwd) {
  const resolvedPath = path.resolve(cwd, modulePath);
  try {
    // 尝试加载模块
    const module = await import(resolvedPath);
    return module;
  } catch (error) {
    // 处理加载模块失败的情况
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
  private files: Record<string, string> = {};
  private rootOptions: Record<string, any> = {};
  constructor(rootDirectory: string, plugins = {}) {
    this.rootDirectory = rootDirectory;
    this.plugins = plugins;
  }

  // 创建所有插件的相关文件
  async generate() {
    // 为每个 plugin 创建 GeneratorAPI 实例，调用插件中的 generate
    for (const pluginName of Object.keys(this.plugins)) {
      const generatorAPI = new GeneratorAPI(
        pluginName,
        this,
        this.plugins[pluginName],
        this.rootOptions,
      );
      let pluginGenerator;
      if (process.env.NODE_ENV === "DEV") {
        const pluginPathInDev = `packages/@plugin/plugin-${pluginName.toLowerCase()}`;
        pluginGenerator = await loadModule(pluginPathInDev, process.cwd());
      } else if (process.env.NODE_ENV === "PROD") {
        const pluginPathInProd = `node_modules/${pluginName.toLowerCase()}-plugin-test-ljq`;
        pluginGenerator = await loadModule(pluginPathInProd, this.rootDirectory);
      } else {
        throw new Error("NODE_ENV is not set");
      }
      if (pluginGenerator && typeof pluginGenerator.generator === "function") {
        await pluginGenerator.generator(generatorAPI);
      }
    }

    // 在文件生成之前提取配置文件
    // 整合需要安装的文件
    // 这里假设 GeneratorAPI 有一个方法来更新这个 Generator 实例的 files
    // createFiles 函数需要你根据自己的逻辑实现文件创建和写入磁盘的逻辑

    // 安装文件
    await createFiles(this.rootDirectory, this.files);
    console.log("Files have been generated and written to disk.");
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
   * 获取当前所有文件
   * @returns 当前所有文件
   */
  getFiles(): Record<string, string> {
    return this.files;
  }
}

export default Generator;
