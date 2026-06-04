export default function FoldedSummary() {
  return (
    <details className="text-[#6c7086] text-[10px] bg-[#181825] px-2 py-1 rounded mx-2 mt-1">
      <summary className="cursor-pointer hover:text-[#a6adc8]">📦 已完成/过期任务已折叠</summary>
      <div className="mt-1 pl-3 text-[#585b70]">任务完成后其聊天记录自动折叠，释放上下文窗口</div>
    </details>
  )
}
