/// <reference path="./wx.d.ts" />

interface IAppOption {
  globalData?: Record<string, unknown>;
}

declare const App: WechatMiniprogram.App.Constructor;
declare const Page: WechatMiniprogram.Page.Constructor;
declare const Component: WechatMiniprogram.Component.Constructor;
declare const Behavior: WechatMiniprogram.Behavior.Constructor;
declare const getApp: WechatMiniprogram.App.GetApp;
declare const getCurrentPages: WechatMiniprogram.Page.GetCurrentPages;
declare const wx: WechatMiniprogram.Wx;
