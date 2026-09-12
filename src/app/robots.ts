import type { MetadataRoute } from "next";

/**
 * 未成年の身体データを扱うため、検索エンジンには一切載せない。
 * ログインが必要なのでクローラは本文を取得できないが、
 * URLの構造まで拾わせない意思表示として明示する。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
