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

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    // exFATはシンボリックリンク非対応のため解決を無効化
    config.resolve.symlinks = false;
    return config;
  },
};

export default nextConfig;
