import path from "path";

import { FileData } from "../models/FileTree";

/**
 * 根据给定的文件路径，从嵌套的文件结构中检索目标文件的数据。
 * @param {FileData} rootFileData 包含嵌套文件信息的根文件数据对象。
 * @param {string} filePath 目标文件的路径，使用 '/' 作为分隔符。文件不需要后缀名，比如src/App.jsx就传src/App
 * @returns {FileData | null} 如果找到目标文件数据则返回，否则返回 null。
 */
export const getTargetFileData = (rootFileData: FileData, filePath: string) => {
  const fileArr = filePath.split("/");
  let targetFileData = rootFileData;
  for (let i = 0; i < fileArr.length; i++) {
    const targetFileName = fileArr[i];
    // 在嵌套结构中是否找到文件targetFileName的标识符
    let flag = false;
    for (let j = 0; j < targetFileData.children.length; j++) {
      flag = false;
      // 不包含文件后缀
      const fileName = path.basename(targetFileData.children[j].path).split(".")[0];
      if (fileName === targetFileName) {
        flag = true;
        targetFileData = targetFileData.children[j];
        break;
      }
    }
    if (!flag) {
      // 代表没找到文件
      console.error("文件路径有误或文件不存在");
      return null;
    }
  }
  return targetFileData;
};

/**
 * 替换指定字符串中的动态 slot 占位符为提供的代码。
 * @param {string} inputString 输入的原始字符串。
 * @param {string} slotName 动态 slot 的名称，标识要替换的占位符，如 "store-slot"。
 * @param {string} replacementCode 替换的代码内容，将插入到匹配的占位符位置。
 * @returns {string} 替换后的字符串，其中指定的 slot 被替换为提供的代码内容。
 */
export function replaceDynamicSlot(inputString: string, slotName: string, replacementCode: string) {
  // 动态生成正则表达式，匹配包含指定 slotName 的占位符
  const regex = new RegExp(`\\/\\*\\s*slot:\\s*${slotName}\\s*\\*\\/`, "g");

  // 使用传入的 replacementCode 替换匹配到的内容
  const result = inputString.replace(regex, replacementCode);

  return result;
}
