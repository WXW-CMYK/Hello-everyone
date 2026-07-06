# Smart Brochure Generator 已知问题与风险

本文档记录 MVP 阶段发布、测试和使用中需要关注的已知风险。

## macOS 未签名 Gatekeeper 提示

当前 macOS 本地打包产物未配置 Apple Developer ID 签名和 notarization。用户首次打开 DMG 或 App 时，可能看到 Gatekeeper 安全提示。

建议处理：

- MVP 内测阶段在测试说明中明确提示。
- 正式发布前配置 Developer ID Application 证书。
- 正式发布前完成 notarization 和 stapling。

## Windows EXE 未签名安全提示

当前 Windows NSIS 安装包未配置代码签名。下载或安装时可能被 Windows SmartScreen、Defender 或第三方杀毒软件提示风险。

建议处理：

- MVP 内测阶段记录所有安全提示截图和文案。
- 正式发布前购买并配置代码签名证书。
- 发布说明中解释安装包来源和校验方式。

## AI 输出 JSON 解析失败边界情况

AI 服务要求模型返回结构化 JSON，但真实模型可能返回 Markdown 包裹、额外说明、字段缺失、数组格式异常或被截断内容。

建议处理：

- 保留 mock fallback，保证本地演示流程可用。
- 对真实 API 测试覆盖成功、失败、超时和非 JSON 响应。
- 后续可增加 JSON schema 校验、自动修复和重试策略。

## PDF 版式需要人工视觉确认

PDF 导出基于当前模板、图片和文案渲染。不同内容长度、图片比例、字体环境和平台渲染差异可能导致局部溢出、分页不理想或视觉层级不一致。

建议处理：

- 每次发布前至少导出一份完整样例 PDF。
- 人工检查 A4 尺寸、多页顺序、模板颜色、Logo、产品图和文案排版。
- 后续可补充自动 PDF 截图比对。

## 删除 userData/assets 后图片会丢失

上传的 Logo 和产品图片会复制到 Electron `userData/assets` 目录。项目不依赖原始图片路径，但如果用户手动删除该 assets 目录或清理应用数据，项目中的图片引用会失效。

建议处理：

- MVP 阶段在测试说明中记录该限制。
- 后续可增加缺失资源提示、重新绑定图片和资源清理管理能力。
