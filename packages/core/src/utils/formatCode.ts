import prettier from "prettier";
import prettierPluginVue from "prettier-plugin-vue";

const needFormat = ["ts", "tsx", "js", "jsx", "vue"];

/**
 * 格式化代码字符串并移除特定注释标记
 * @param code 待格式化的代码字符串
 * @param extension 文件扩展名，用于判断是否需要格式化
 * @returns 返回格式化后的代码字符串
 */
const formatCode = async (code: string, extension: string) => {
  if (!needFormat.includes(extension)) return code;

  // 移除形如 `/* slot: use-pinia-slot */` 的注释标记
  const result = code.replace(/\/\*\s*slot:\s*\w+(?:-\w+)*\s*\*\//g, "");
  const formatted = await prettier.format(result, {
    parser: extension === "vue" ? "vue" : "babel",
    plugins: [prettierPluginVue], // 引入 Vue 插件
  });
  return formatted;
};

export default formatCode;
