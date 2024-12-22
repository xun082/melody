const globalProtocol = {
  ENTRY_FILE: "ENTRY_FILE", // 入口文件配置，如：入口文件引入全局 less、scss
  UPDATE_EXPORT_CONTENT_PROTOCOL: "UPDATE_EXPORT_CONTENT_PROTOCOL",
  INSERT_IMPORT_PROTOCOL: "INSERT_IMPORT_PROTOCOL",
};

// 插件对框架的协议
const pluginToTemplateProtocol = {
  ...globalProtocol,
  PROCESS_STYLE_PLUGIN: "PROCESS_STYLE_PLUGIN",
};

// 插件对构建工具的协议
const pluginToBuildToolProtocol = {
  ...globalProtocol,
};

// 框架对构建工具的协议
const templateToBuildToolProtocol = {
  ...globalProtocol,
  ADD_CONFIG: "ADD_CONFIG", //根据框架，不同的打包工具需要不同的插件，有些是都需要用的，有些是框架独有的
};

module.exports = {
  globalProtocol,
  pluginToTemplateProtocol,
  pluginToBuildToolProtocol,
  templateToBuildToolProtocol,
};
