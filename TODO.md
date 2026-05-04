1. feat: 右上角点击弹出 sign out 和 import data, import data 点击后跳转到导入数据页面 （Done）
2. bug: retake assesment直接跳转到首页了 （Done）
3. docs: 更新CLAUDE.md，增加TECH.md，说明目前实现方式，以及需要和PM对齐的东西 （Done）
4. feat: 更新Match计算方式，对CLAUDE输出进行缓存 （Done）

现在的问题是：（Done）
1. API调用时间太长
2. dashboard显示的Match不是LLM输出的
3. API调用成本太高
4. API输出要保持一致

现在的问题是：
1. Match一致性问题：可能的解决方案：不用LLM计算Match，只做评估 / Dashboard不展示未计算的Match
2. 目前基于Haiku，可以加入Deep Analyze，允许会员使用Sonnet/Opus分析


Next Week
1. feat: 阅读文档的展示界面
2. feat: 实现RAG检索
3. Bugfix: 移动端的UI展示，目前底部工具栏需要滚动才能看到，改成固定在底部