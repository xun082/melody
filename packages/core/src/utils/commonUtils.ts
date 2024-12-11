// import path from "path";

// import { FileData } from "../models/FileTree";

// /**
//  * 根据给定的文件路径，从嵌套的文件结构中检索目标文件的数据。
//  *
//  * @param {FileData} rootFileData 包含嵌套文件信息的根文件数据对象。
//  * @param {string} filePath 目标文件的路径，使用 '/' 作为分隔符。
//  * @returns {FileData | null} 如果找到目标文件数据则返回，否则返回 null。
//  */
// const getTargetFileData = (rootFileData: FileData, filePath: string) => {
//   const fileArr = filePath.split("/");
//   let targetFileData = rootFileData.children;
//   for (let i = 0; i < fileArr.length; i++) {
//     const targetFileName = fileArr[i];
//     let flag = false;
//     for (let j = 0; j < targetFileData.length; j++) {
//       const fileName = path.basename(targetFileData[j].path);
//       if (fileName === targetFileName) {
//         flag = true;
//         targetFileData = targetFileData[i].children;
//         break;
//       }
//     }
//     if (!flag) {
//       // 代表没找到文件
//       console.log("文件路径有误或文件不存在");
//       return null;
//     }
//   }
//   return targetFileData;
// };
