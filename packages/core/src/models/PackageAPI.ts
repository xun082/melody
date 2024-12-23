import fs from "fs";
import type { PackageJson } from "pkg-types";

import { createFiles } from "../utils/createFiles";
/**
 * 封装对 package.json 文件的操作。
 * @class
 */
class PackageAPI {
  private filePath: string;
  /**
   * 创建一个 PackageAPI 实例。
   * @constructor
   * @param {string} filePath - 文件路径。
   */
  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * 创建 package.json 文件。
   * @async
   * @method
   * @param {PackageJson} content - package.json 文件的内容。
   * @returns {Promise<void>} Promise 对象，在创建完成后解析。
   */
  async createPackageJson(content: PackageJson) {
    await createFiles(this.filePath, {
      "package.json": JSON.stringify(content, null, 2),
    });
  }

  /**
   * 读取 package.json 文件内容。
   * @async
   * @method
   * @returns {Promise<object>} Promise 对象，在读取完成后解析为文件内容。
   */
  async readPackageJson(): Promise<object> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, "utf8", (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(data));
        }
      });
    });
  }

  /**
   * 更新 package.json 文件内容。
   * @async
   * @method
   * @param {PackageJson} content - 新的 package.json 文件内容。
   * @returns {Promise<string>} Promise 对象，在更新完成后解析为成功消息。
   */
  async updatePackageJson(content: PackageJson): Promise<string> {
    return new Promise((resolve, reject) => {
      this.readPackageJson()
        .then((data) => {
          const updatedContent = { ...data, ...content };
          return this.createPackageJson(updatedContent);
        })
        .then(() => {
          resolve("package.json file has been updated successfully");
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  /**
   * 删除 package.json 文件。
   * @async
   * @method
   * @returns {Promise<string>} Promise 对象，在删除成功后解析为成功消息。
   */
  async deletePackageJson(): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.unlink(this.filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve("package.json file has been deleted successfully");
        }
      });
    });
  }
}

export default PackageAPI;
