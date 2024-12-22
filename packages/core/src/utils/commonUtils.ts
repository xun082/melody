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
