# Smart Brochure Generator MVP 全流程测试计划

本文档用于 MVP 阶段的跨平台验收测试，覆盖创建项目、AI 文案生成、编辑器、模板、图片上传、PDF 导出、安装包和数据持久化。

## 测试前准备

- 确认依赖已安装：`npm ci`
- 确认本地构建通过：`npm run build`
- macOS 安装包命令：`npm run dist:mac`
- Windows 安装包命令：`npm run dist:win`
- 准备测试图片：
  - Logo：PNG 或 WEBP，建议透明背景
  - 产品图：JPG、JPEG、PNG 或 WEBP
- 准备真实 API Key 测试信息：
  - API Key
  - Endpoint
  - Model

## macOS 测试流程

1. 执行 `npm run build`。
2. 执行 `npm run dist:mac`。
3. 确认 `release/` 目录生成 `.dmg` 文件。
4. 打开 DMG，确认应用图标显示正确。
5. 将 `Smart Brochure Generator.app` 拖入 Applications 或直接打开 app。
6. 如果出现未签名提示，按 macOS 安全策略允许打开。
7. 进入设置页，保存 AI 设置、默认品牌信息和导出设置。
8. 创建一个宣传册项目。
9. 启用 mock fallback，生成 AI 文案。
10. 进入项目列表，确认项目显示正常。
11. 点击项目名称进入编辑器。
12. 依次切换 4 套模板：
    - 商务简洁
    - 科技产品
    - 高端品牌
    - 展会单页
13. 上传 Logo 和产品图片。
14. 编辑标题、介绍、卖点、场景、FAQ 和 CTA。
15. 保存项目，确认保存状态变为已保存。
16. 导出 PDF，确认成功提示和打开文件所在位置能力可用。
17. 打开 PDF，进行视觉检查。
18. 关闭 App 后重新打开，确认设置、项目、模板、图片和内容仍然保留。

## Windows 测试流程

1. 在 GitHub Actions 手动触发 `Build Desktop Installers` workflow，或在 Windows 机器执行 `npm run dist:win`。
2. 下载 `smart-brochure-generator-windows` artifact。
3. 解压 artifact，找到 `release/` 中的 `.exe` 安装包。
4. 运行安装包。
5. 如果出现 SmartScreen、Defender 或杀毒软件提示，记录提示内容并选择允许继续测试。
6. 确认开始菜单或桌面快捷方式图标显示正确。
7. 打开 App。
8. 进入设置页，保存 AI 设置、默认品牌信息和导出设置。
9. 创建宣传册项目。
10. 使用 mock fallback 生成 AI 文案。
11. 从项目列表打开编辑器。
12. 切换 4 套模板，确认预览明显变化。
13. 上传 Logo 和产品图片。
14. 保存项目。
15. 导出 PDF 到用户可访问目录。
16. 打开 PDF，确认模板、Logo、产品图和文案都存在。
17. 关闭 App 后重新打开，确认数据仍然保留。

## AI Mock Fallback 测试

1. 进入设置页。
2. 清空 API Key，或填写不可用的测试 Key。
3. 开启 mock fallback。
4. 创建或打开一个项目。
5. 点击生成 AI 内容。
6. 预期结果：
   - 生成状态经历“生成中”。
   - 最终显示生成成功。
   - 项目 `content` 字段被填充。
   - 编辑器中可看到结构化文案。

## 真实 API Key 测试

1. 进入设置页。
2. 填写真实 API Key。
3. 填写可用 Endpoint 和 Model。
4. 可保留 mock fallback 开启，用于接口失败时兜底；也可关闭以验证真实错误提示。
5. 创建或打开一个项目。
6. 点击生成 AI 内容。
7. 预期结果：
   - 请求成功时生成结构化 JSON 内容。
   - 内容字段包含封面、介绍、卖点、痛点、方案、场景、规格、FAQ 和 CTA。
   - 如果接口失败或 JSON 解析失败，页面显示清晰错误信息。
   - 关闭 mock fallback 时，不应静默生成 mock 内容。

## 图片上传测试

1. 在编辑器右侧属性面板上传 Logo。
2. 上传产品图片。
3. 分别测试 PNG、JPG、JPEG、WEBP。
4. 保存项目。
5. 切换模板，确认图片仍然显示且版式适配。
6. 关闭 App 后重新打开项目，确认图片仍然显示。
7. 检查点：
   - 项目不依赖原始图片路径。
   - 图片应来自 app `userData/assets` 下的复制文件或安全引用。
   - 删除 Logo 和删除产品图片功能可正常清空对应资源。

## PDF 导出视觉检查

1. 在编辑器中选择一套模板。
2. 确保项目包含 Logo、产品图和完整文案。
3. 点击“导出 PDF”。
4. 在保存对话框中确认默认文件名包含设置页的 PDF 文件名前缀和项目名称。
5. 保存 PDF。
6. 打开 PDF，确认至少包含：
   - 封面页
   - 产品介绍页
   - 核心卖点页
   - 应用场景页
   - FAQ / CTA 页
7. 视觉检查点：
   - A4 尺寸正常。
   - 当前模板颜色和版式生效。
   - Logo 清晰可见。
   - 产品图片比例正常。
   - 文案没有明显截断、重叠或溢出。
   - 多页内容顺序清晰。

## 数据持久化测试

1. 进入设置页，修改并保存：
   - API Key
   - Endpoint
   - Model
   - mock fallback
   - 默认品牌信息
   - 默认导出路径
   - PDF 文件名前缀
2. 创建项目并生成内容。
3. 在编辑器中修改内容、模板、Logo 和产品图。
4. 保存项目。
5. 关闭 App。
6. 重新打开 App。
7. 预期结果：
   - 设置仍然存在。
   - 项目列表仍然显示刚创建的项目。
   - 编辑器内容、模板、Logo 和产品图仍然存在。
   - 更新时间与保存行为一致。

## DMG 安装测试

1. 执行 `npm run dist:mac`。
2. 打开 `release/` 中生成的 `.dmg`。
3. 确认 DMG 中 app 名称和图标正确。
4. 将 app 拖入 Applications。
5. 从 Applications 打开 App。
6. 完成 macOS 测试流程中的核心路径：
   - 设置保存
   - 创建项目
   - mock AI 生成
   - 编辑器保存
   - 图片上传
   - PDF 导出
   - 重启持久化

## EXE 安装测试

1. 通过 GitHub Actions 或 Windows 本机生成 `.exe`。
2. 在 Windows 真机或干净 VM 中运行安装包。
3. 确认安装流程完成。
4. 从开始菜单或桌面快捷方式打开 App。
5. 完成 Windows 测试流程中的核心路径：
   - 设置保存
   - 创建项目
   - mock AI 生成
   - 编辑器保存
   - 图片上传
   - PDF 导出
   - 重启持久化

## 测试记录模板

| 项目 | 平台 | 结果 | 备注 |
| --- | --- | --- | --- |
| Build | macOS / Windows | 未测试 |  |
| 安装包生成 | macOS / Windows | 未测试 |  |
| 应用启动 | macOS / Windows | 未测试 |  |
| 设置保存 | macOS / Windows | 未测试 |  |
| 创建项目 | macOS / Windows | 未测试 |  |
| AI mock fallback | macOS / Windows | 未测试 |  |
| 真实 API Key | macOS / Windows | 未测试 |  |
| 编辑器保存 | macOS / Windows | 未测试 |  |
| 模板切换 | macOS / Windows | 未测试 |  |
| 图片上传 | macOS / Windows | 未测试 |  |
| PDF 导出 | macOS / Windows | 未测试 |  |
| 重启持久化 | macOS / Windows | 未测试 |  |
