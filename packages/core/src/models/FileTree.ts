import path from "path";
import fs from "fs-extra";
import ejs from "ejs";

import { createFiles } from "../utils/createFiles";
import formatCode from "../utils/formatCode";

import PluginToTemplateAPI from "./protocolGenerator/PluginToTemplateAPI";
/**
 * 判断是否为文件夹
 * @param {string} path - 路径
 * @returns {boolean} - 返回路径是否为文件夹
 */
function isDirectoryOrFile(path: string) {
  try {
    const stats = fs.statSync(path);
    return stats.isDirectory();
  } catch (err) {
    // 处理错误
    return false;
  }
}

/**
 * 文件描述接口
 * @interface
 * @property {string} fileName - 文件名
 * @property {string} fileExtension - 文件扩展名
 * @property {*} fileContent - 文件内容
 */
export interface FileDescribe {
  fileName: string;
  fileExtension: string;
  fileContent: any;
}

/**
 * 文件数据接口
 * @interface
 * @property {string} path - 路径
 * @property {"dir" | "file"} [type] - 类型
 * @property {FileData[]} children - 子节点
 * @property {Partial<FileDescribe>} describe - 文件描述
 */
export interface FileData {
  path: string;
  type?: "dir" | "file";
  children: FileData[];
  describe: Partial<FileDescribe>;
}

/**
 * 文件树类
 * @class
 */
class FileTree {
  private rootDirectory: string;
  private fileData: any;
  private pluginToTemplateAPI: PluginToTemplateAPI;

  constructor(rootDirectory: string) {
    this.rootDirectory = rootDirectory;
    this.fileData = {
      path: rootDirectory,
      type: "dir",
      children: [],
      describe: { fileName: path.basename(rootDirectory) },
    };
    // 初始化 PluginToTemplateAPI，传入所需协议
    this.pluginToTemplateAPI = new PluginToTemplateAPI();
  }

  /**
   * 根据目录构造文件树对象
   * @param src 文件或文件夹的真实路径
   * @param parentDir 创建文件后的父文件夹路径
   * @returns 文件树对象
   */
  private buildFileData(src: string, parentDir?: string) {
    const baseName = path.basename(src);

    const file: any = {
      path: path.resolve(parentDir, baseName),
      children: [],
      describe: {},
    };

    if (isDirectoryOrFile(src)) {
      file.type = "dir";
      file.describe.fileName = baseName;
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const subTree = this.buildFileData(
          path.join(src, entry.name),
          path.relative(parentDir, baseName),
        );
        file.children?.push(subTree);
      }
    } else {
      const fileContent = fs.readFileSync(src, "utf8");
      file.type = "file";
      file.describe = {
        fileName: path.basename(src).split(".")[0],
        fileExtension: path.extname(src).slice(1),
        fileContent,
      };
    }
    return file;
  }

  /**
   * 通过ejs模板构建文件数据
   * @param src 源文件路径
   * @param parentDir 父目录
   * @param options ejs选项
   */
  private buildFileDataByEjs(src: string, parentDir: string, options: any) {
    const baseName = path.basename(src);
    const file: any = {
      path: "",
      children: [],
      describe: {},
    };

    if (isDirectoryOrFile(src)) {
      file.type = "dir";
      file.path = path.resolve(parentDir, baseName);
      file.describe.fileName = baseName;
      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const subTree = this.buildFileDataByEjs(
          path.join(src, entry.name),
          path.relative(parentDir, baseName),
          options,
        );
        file.children?.push(subTree);
      }
    } else {
      let fileContent = fs.readFileSync(src, "utf8");
      // EJS 渲染
      fileContent = ejs.render(fileContent, options);

      file.type = "file";
      file.describe = {
        fileName: path.basename(src).split(".")[0],
        fileExtension: path.extname(src).slice(1),
        fileContent,
      };
      file.path = path.resolve(
        parentDir,
        `${file.describe.fileName}.${file.describe.fileExtension}`,
      );
    }
    return file;
  }
  /**
   * 根据template模板路径向文件树中添加节点
   * @param url 添加文件的原始的真实路径
   * @param parentDir 父文件夹路径
   */
  addToTreeByTemplateDirPath(url: string, parentDir: string) {
    if (path.basename(url) === "template") {
      const entries = fs.readdirSync(url, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const subTree = this.buildFileData(path.join(url, entry.name), parentDir);
        this.fileData.children.push(subTree);
      }
    }
  }

  /**
   * 根据template模板路径向文件树中添加节点(适用于需要ejs渲染的模板)
   * @param url 添加文件的原始的真实路径
   * @param parentDir 父文件夹路径
   */
  addToTreeByTemplateDirPathAndEjs(url: string, parentDir: string, options: any) {
    if (path.basename(url) === "template") {
      const entries = fs.readdirSync(url, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const subTree = this.buildFileDataByEjs(path.join(url, entry.name), parentDir, options);
        this.fileData.children.push(subTree);
      }
    }
  }

  /**
   * 根据文件内容以及名称将文件添加到创建的根目录中(只适用于将文件添加到创建的根目录)
   * @param {string} fullFileName - 添加的文件名(包含文件后缀)
   * @param {string} fileContent - 添加的文件的内容
   */
  addToTreeByFile(fullFileName: string, fileContent: string) {
    const fullPath = path.resolve(this.rootDirectory, fullFileName);
    const fileNameSplit = fullFileName.split(".");
    let fileName; // 文件名称(不包含文件后缀)
    if (fileNameSplit.length <= 2) {
      fileName = fileNameSplit[0];
    } else {
      fileName = fileNameSplit.slice(0, -1).join(".");
    }
    // 全文件名.分割的最后一位作为拓展名(babel.config.js、.browserslistrc、.eslintrc.js等等)
    const fileExtension = fileNameSplit[fileNameSplit.length - 1];
    this.fileData.children.push({
      path: fullPath,
      children: [],
      type: "file",
      describe: { fileName, fileContent, fileExtension },
    });
  }
  /**
   * 统一渲染所有文件
   */
  async renderAllFiles(parentDir: string, fileData: FileData = this.fileData) {
    // 渲染根fileTree对象中的children中的内容 --> 根目录内的文件
    for (const item of fileData.children) {
      if (item.type === "dir") {
        const filePath = path.resolve(parentDir, item.describe.fileName);
        // 创建文件夹
        !fs.existsSync(filePath) && fs.mkdirSync(filePath);
        // 如果是文件夹类型则递归生成
        const dirName = path.resolve(parentDir, item.describe.fileName);
        await this.renderAllFiles(dirName, item);
      } else {
        // 如果是文件类型直接生成
        const fileName = `${item.describe.fileName}.${item.describe.fileExtension}`;
        const fileContent = await formatCode(
          item.describe.fileContent,
          item.describe.fileExtension,
        );
        await createFiles(parentDir, {
          [fileName]: fileContent,
        });
      }
    }
  }

  getFileData(): FileData {
    return this.fileData;
  }
}
export default FileTree;
