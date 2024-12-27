import fs from "fs";
import path from "path";

import { ProtocolProps } from "../BaseAPI";
import { getTargetFileData } from "../../utils/commonUtils";
import { createImportDeclaration, exportDefaultDeclarationUtils } from "../../utils/ast/commonAst";
import { transformCode } from "../../utils/ast/utils";
import { FileData } from "../FileTree";

/**
 * 通用类，为 插件/框架/构建工具 之间的影响定义协议处理器
 * @param protocols 协议内容
 */
class ProtocolGeneratorAPI {
  protected protocols: Record<string, object>; // todo 类型考虑优化
  protected props: ProtocolProps;
  protected protocol: string;

  constructor(protocols, props, protocol) {
    this.protocols = protocols;
    this.props = props;
    this.protocol = protocol;
  }

  generator() {
    // todo: 加入优先级调度
    const protocol = this.protocol;
    const protocols = this.protocols;
    this[protocol](protocols[protocol]);
  }

  ENTRY_FILE(params) {
    // todo: 路径可能存在问题
    const srcDir = path.resolve(__dirname, "src"); // src 目录路径
    const content = params.content;

    // 处理入口文件
    if (content) {
      const entryFilePath = path.join(srcDir, "index.js"); // 假设入口文件为 index.js
      let entryContent = fs.readFileSync(entryFilePath, "utf-8");

      entryContent += content;

      // 文件重写，实现插入
      // todo: 具体如何实现，其实很灵活，甚至可以借助 AST 进行
      fs.writeFileSync(entryFilePath, entryContent, "utf-8");
    }
  }

  /**
   * 更新目标文件导出内容协议，根据给定的文件路径和新的导出内容更新文件数据。
   *
   * @param params 包含文件路径和新的导出内容的参数对象。
   * @param params.url 目标文件的路径。
   * @param params.exportContent 要更新的导出内容。
   * @param params.parserOptions ast的解析器
   * @param params.astOptions - ast相关配置
   */
  UPDATE_EXPORT_CONTENT_PROTOCOL({ params }) {
    const { url, exportContent, astOptions } = params;
    const { parserOptions } = astOptions;
    const fileData: FileData = this.props.files.getFileData();
    const targetFile = getTargetFileData(fileData, url);
    const content = targetFile.describe.fileContent;
    const operations = {
      ExportDefaultDeclaration(path) {
        exportDefaultDeclarationUtils(path, exportContent);
      },
    };
    targetFile.describe.fileContent = transformCode(content, operations, parserOptions);
  }

  /**
   * 处理 Import 语句的插入
   * @param params - 导入配置参数
   * @param params.imports - 导入配置数组
   * @param params.imports.dir - 目标文件路径
   * @param params.imports.modules[] - 导入的模块信息
   * @param params.imports.modules[].name - 导入的模块名称
   * @param params.imports.modules[].from - 导入的模块路径
   * @param params.astOptions - ast相关配置
   */
  INSERT_IMPORT_PROTOCOL({ params }) {
    const { imports, astOptions } = params;
    const { parserOptions } = astOptions;

    const fileData: FileData = this.props.files.getFileData();

    for (const importConfig of imports) {
      const { dir, modules } = importConfig;
      const targetFile = getTargetFileData(fileData, dir);
      if (targetFile?.describe?.fileContent) {
        const content = targetFile.describe.fileContent;
        const operations = {
          // 遍历 AST，找到最后一个 ImportDeclaration 的位置
          ImportDeclaration(path) {
            // 当前 Program 节点的所有顶级节点
            const programBody = path.parent.body;
            const importDeclarations = programBody.filter(
              (node) => node.type === "ImportDeclaration",
            );

            // 映射出当前文件已经引入的模块
            const existingImports = new Set(importDeclarations.map((node) => node.source.value));

            // 需要插入的import语句
            const needImports = [];
            for (let i = 0; i < modules.length; i++) {
              const { name, from } = modules[i];
              // 当前要from的模块是否已经存在
              const isNeed = !existingImports.has(from);
              if (isNeed) {
                const importModule = createImportDeclaration(name, from);
                needImports.push(importModule);
              }
            }

            // 存在需要插入的模块
            if (needImports.length) {
              if (importDeclarations.length) {
                // 找到最后一个 ImportDeclaration 节点
                const lastImportPath = path.getSibling(importDeclarations.length - 1);
                lastImportPath.insertAfter(needImports);
              } else {
                // 如果没有 ImportDeclaration，插入到 Program 顶部
                const programPath = path.parentPath;
                programPath.unshiftContainer("body", needImports);
              }
            }
          },
        };
        targetFile.describe.fileContent = transformCode(content, operations, parserOptions);
      }
    }
  }
}

export default ProtocolGeneratorAPI;
