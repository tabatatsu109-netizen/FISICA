import type { NextConfig } from "next";
import fs from "fs";

// exFATドライブではNodeのreadlinkが通常ファイルに対してEINVALではなく
// EISDIRを返すため、webpackがシンボリックリンク判定に失敗しビルドが落ちる。
// EISDIRをEINVAL(=シンボリックリンクではない)として扱うようパッチする。
function toEinval(err: NodeJS.ErrnoException): NodeJS.ErrnoException {
  if (err.code === "EISDIR") {
    const e: NodeJS.ErrnoException = new Error(err.message.replace("EISDIR", "EINVAL"));
    e.code = "EINVAL";
    e.errno = -4071;
    e.syscall = err.syscall;
    e.path = err.path;
    return e;
  }
  return err;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const origReadlink = fs.readlink.bind(fs);
(fs as any).readlink = (path: any, options: any, callback?: any) => {
  const cb = typeof options === "function" ? options : callback;
  const wrapped = (err: NodeJS.ErrnoException | null, link?: string) =>
    cb(err ? toEinval(err) : null, link);
  if (typeof options === "function") origReadlink(path, wrapped);
  else origReadlink(path, options, wrapped);
};

const origReadlinkSync = fs.readlinkSync.bind(fs);
(fs as any).readlinkSync = (path: any, options?: any) => {
  try {
    return origReadlinkSync(path, options);
  } catch (err) {
    throw toEinval(err as NodeJS.ErrnoException);
  }
};

const origReadlinkPromise = fs.promises.readlink.bind(fs.promises);
(fs.promises as any).readlink = async (path: any, options?: any) => {
  try {
    return await origReadlinkPromise(path, options);
  } catch (err) {
    throw toEinval(err as NodeJS.ErrnoException);
  }
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * 全ページに付ける保護用ヘッダ。
 *
 * Referrer-Policy が特に重要。未設定だと /karte-print/<選手ID>/<月> を開いた状態で
 * 外部リンク(参考ページのJリーグ公式など)を踏んだとき、選手IDを含むURLが
 * そのまま外部サイトへ送られる。
 */
const securityHeaders = [
  // 遷移先が別サイトのときはURLを一切渡さない
  { key: "Referrer-Policy", value: "same-origin" },
  // Content-Type を無視した実行を防ぐ(顔写真を data URL で返しているため)
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 別サイトのiframeに埋め込ませない(クリックジャッキング対策)
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // 使わない端末機能は明示的に塞ぐ。顔写真はファイル選択なのでカメラは自サイトのみ許可
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // 一度HTTPSで来たら以後HTTPには落とさない
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  webpack: (config) => {
    // exFATはシンボリックリンク非対応のため解決を無効化
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
