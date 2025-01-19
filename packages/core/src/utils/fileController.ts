const { resolveApp } = require("@laconic/utils");
import chalk from "chalk";
import ora from "ora";
import fs, { readFileSync } from "fs-extra";
import { join } from "node:path";
import { rmSync } from "node:fs";

import { CLIENT_OS } from "./constants";

/**
 * @author moment
 * @param directoryPath 删除文件的路径，默认 node_modules
 * @param verbose 如果为true，则显示删除信息
 */
export async function removeDirectory(
  directoryPath: string = "node_modules",
  verbose: boolean = true,
) {
  const fullPath = resolveApp(directoryPath);
  /**
   * 删除文件夹。
   * @returns {Promise<boolean>} 删除结果，true 表示成功，false 表示失败。
   */
  async function deleteDirectory() {
    try {
      if (CLIENT_OS === "mac") {
        rmSync(fullPath, { recursive: true, force: true });
      } else {
        await fs.remove(fullPath);
      }
      return true; // 成功删除
    } catch (error) {
      console.error(chalk.bold.red("Deletion failed"), error);
      return false; // 删除失败
    }
  }

  if (verbose) {
    const spinner = ora(chalk.bold.cyan("File being deleted...")).start();
    const success = await deleteDirectory();
    if (success) {
      spinner.succeed(chalk.bold.green("Deleted successfully"));
    } else {
      spinner.fail(chalk.bold.red("Deletion failed"));
    }
  } else {
    await deleteDirectory();
  }
}

/**
 * 从模板目录中读取并返回文件内容的函数
 * @param file 指定要读取的文件名
 * @returns 返回文件内容的字符串
 */
export function readTemplateFileContent(file: string) {
  return readFileSync(join(__dirname, "../../template/", file)).toString();
}

// export async function copyDirectory(source: string, target: string) {
//   console.log(join(__dirname, "../../template/"), 7777);

//   const sourceTarget = join(__dirname, "../../template/", source);

//   console.log(sourceTarget, 66666);

//   try {
//     // 确保目标目录存在，如果不存在则创建
//     await fs.ensureDir(target);

//     // 读取源目录内容
//     const items = await fs.readdir(sourceTarget);

//     // 逐个复制目录内容
//     for (const item of items) {
//       const sourcePath = join(sourceTarget, item);
//       console.log(item, 8888);

//       const targetPath = join(sourceTarget, item);

//       const stats = await fs.stat(sourcePath);

//       if (stats.isDirectory()) {
//         // 递归复制子目录
//         await copyDirectory(sourcePath, targetPath);
//       } else {
//         // 复制文件
//         await fs.copy(sourcePath, targetPath);
//       }
//     }

//     console.log(`目录 ${source} 复制到 ${target} 完成`);
//   } catch (error) {
//     console.error("复制目录内容时发生错误:", error);
//   }
// }

export async function copyDirectory(data: string, target: string) {
  const source = join(__dirname, "../../template/", data);
  try {
    // 使用 fs-extra 的 copy 方法复制整个目录
    await fs.copy(source, target);
    console.log(`目录 ${source} 复制到 ${target} 完成`);
  } catch (error) {
    console.error("复制目录内容时发生错误:", error);
  }
}
