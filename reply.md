已扫描 `D:\Github\trace`。

主要发现：
1. `lib/portfolio.ts:21-24` + `lib/journal-actions.ts:47-68`：卖出后只是把 shares 截到 0，但不会删除或清空持仓。结果全平仓后，`components/portfolio-summary.tsx:19-47` 仍会把这条 0 股记录算作一个 position，并继续显示旧的 avgCost。
2. `lib/portfolio.ts:21-24`：`SELL` 数量大于当前持仓时会被静默截断到 0，而不是报错或提示异常。这会掩盖解析错误或错误输入。
3. `components/ui/textarea.tsx:7-11`：输入框禁用了 resize，首页又只有这一块主输入，长笔记在小屏上会比较难编辑，属于可用性缺陷。

验证结果：
- `npm run lint` 通过。
- `npm test` 和 `npm run build` 都在当前 Windows 环境里遇到 `spawn EPERM`，所以完整自动验证还差一截。
