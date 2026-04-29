// 正式数据接口：给前端页面使用，返回标准 LocationItem[]。
// 注意：此接口不会返回任何敏感环境变量。
import { queryMappedLocations } from "./_lib/notionLocations";

export default async function handler(_req: any, res: any) {
  try {
    // 从 Notion 读取并映射为前端可直接消费的数据结构
    const rows = await queryMappedLocations();
    res.status(200).json(rows);
  } catch (error) {
    console.error("Failed to query Notion database", error);
    res.status(500).json({ message: "Failed to query Notion database" });
  }
}
