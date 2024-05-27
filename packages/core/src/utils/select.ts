import { multiselect, select, intro } from "@clack/prompts";
import chalk from "chalk";
import { execSync } from "child_process";

import { buildToolType } from "../types";

import { getPreset, defaultPresetLib, defaultPresetVue, defaultPresetReact } from "./preset";
import { getNpmSource } from "./getnpmSource";

const registryInfo = execSync("npm config get registry").toString().trim();
const npmSource: any = getNpmSource();
/**
 * 表示用户对项目预设的回应。
 * @interface Responses
 * @property {string} template - 选择的模板名称。
 * @property {string} buildTool - 选择的构建工具名称。
 * @property {string[]} plugins - 选择的插件列表。
 * @property {string} packageManager - 选择的包管理器名称。
 * @property {string} npmSource - 选择的 npm 源名称。
 * @property {boolean} extraConfigFiles - 选择文件生成位置 'In dedicated config files' --> true 'In packagejson' --> false。
 */
interface Responses {
  template: string;
  buildTool?: buildToolType;
  plugins: string[];
  packageManager: string;
  npmSource: string;
  extraConfigFiles: boolean;
}

/**
 *
 * @param plugins 预设的插件对象
 * @returns 返回默认预设的插件组合
 */
function getPluginsName(plugins: Record<string, any>) {
  const pluginsKey = Object.keys(plugins);
  const pluginsName = pluginsKey.reduce((pre, name, idx) => {
    return pre + name + (idx === pluginsKey.length - 1 ? "" : ", ");
  }, "");
  return pluginsName;
}

/**
 * @description 终端交互，获取用户的项目预设
 * @returns 返回用户的项目预设 Responses
 */
async function projectSelect() {
  const responses: Responses = {
    template: "",
    plugins: [],
    packageManager: "",
    npmSource: "",
    extraConfigFiles: true,
  };

  intro(chalk.green(" create-you-app "));
  // 选择是否使用默认模板或者手动选择预设
  const libPluginsName = getPluginsName(defaultPresetLib.plugins);
  const vuePluginsName = getPluginsName(defaultPresetLib.plugins);
  const reactPluginsName = getPluginsName(defaultPresetLib.plugins);
  const isUseDefaultPreset = (await select({
    message: "Please pick a preset:",
    options: [
      {
        value: "lib",
        label: `Default-lib(${chalk.yellow("[" + defaultPresetLib.template + "] ")}${chalk.yellow(libPluginsName)}, ${chalk.yellow(defaultPresetLib.buildTool)})`,
      },
      {
        value: "vue",
        label: `Default-vue(${chalk.yellow("[" + defaultPresetVue.template + "] ")}${chalk.yellow(vuePluginsName)}, ${chalk.yellow(defaultPresetVue.buildTool)})`,
      },
      {
        value: "react",
        label: `Default-react(${chalk.yellow("[" + defaultPresetReact.template + "] ")}${chalk.yellow(reactPluginsName)}, ${chalk.yellow(defaultPresetReact.buildTool)})`,
      },
      { value: "false", label: "Manually select preset" },
    ],
  })) as string;

  if (isUseDefaultPreset === "lib") {
    defaultPresetLib.npmSource = registryInfo;
    return defaultPresetLib;
  } else if (isUseDefaultPreset === "vue") {
    defaultPresetVue.npmSource = registryInfo;
    return defaultPresetVue;
  } else if (isUseDefaultPreset === "react") {
    defaultPresetReact.npmSource = registryInfo;
    return defaultPresetReact;
  }

  // 选择模板预设
  responses.template = (await select({
    message: "Pick a template please",
    options: [
      { value: "common-lib", label: "common-lib" },
      { value: "vue", label: "vue" },
      { value: "react", label: "react" },
      { value: "template-test", label: "test" },
    ],
  })) as string;

  // 选择构建工具
  responses.buildTool = (await select({
    message: "Pick a build tools for your project",
    options: [
      { value: "webpack", label: "webpack" },
      { value: "vite", label: "vite" },
      { value: "rollup", label: "rollup" },
    ],
  })) as buildToolType;

  // 选择插件
  responses.plugins = (await multiselect({
    message: `Pick plugins for your project.(${chalk.greenBright(
      "<space>",
    )} select, ${chalk.greenBright("<a>")} toggle all, ${chalk.greenBright(
      "<i>",
    )} invert selection,${chalk.greenBright("<enter>")} next step)`,
    options: [
      { value: "babel", label: "babel" },
      { value: "typescript", label: "typescript" },
      { value: "eslint", label: "eslint" },
      { value: "prettier", label: "prettier" },
    ],
    required: false,
  })) as string[];

  // 选择包管理器
  responses.packageManager = (await select({
    message: "Pick a packageManager for your project",
    options: [
      { value: "pnpm", label: "pnpm" },
      { value: "yarn", label: "yarn" },
      { value: "npm", label: "npm" },
    ],
  })) as string;

  // 选择npm源
  responses.npmSource = (await select({
    message: "Pick a npm source for your project",
    initialValue: registryInfo,
    options: npmSource,
  })) as string;

  // 选择插件配置文件生成位置
  responses.extraConfigFiles = (await select({
    message:
      "Where do you want to place the configurations, such as Babel, ESLint, and other plugins?",
    options: [
      { value: true, label: "In dedicated config files" },
      { value: false, label: "In package.json" },
    ],
  })) as boolean;

  return getPreset(
    responses.template,
    responses.buildTool,
    responses.plugins,
    responses.packageManager,
    responses.npmSource,
    responses.extraConfigFiles,
  );
}

export { projectSelect };
