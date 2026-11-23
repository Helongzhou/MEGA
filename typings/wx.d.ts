/** Minimal WeChat miniprogram typings used by this project. */

declare const console: {
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  info(...args: any[]): void;
};

declare namespace WechatMiniprogram {
  interface Wx {
    getSystemInfoSync(): SystemInfo;
    createInnerAudioContext(): InnerAudioContext;
    getXrFrameSystem(): any;
  }

  interface SystemInfo {
    windowWidth: number;
    windowHeight: number;
    pixelRatio: number;
    platform?: string;
    SDKVersion?: string;
  }

  interface InnerAudioContext {
    src: string;
    volume: number;
    play(): void;
    stop(): void;
    seek(position: number): void;
    destroy(): void;
  }

  interface TouchEvent {
    currentTarget: { dataset: Record<string, any> };
    target: { dataset: Record<string, any> };
    touches: Array<{ pageX: number; pageY: number }>;
    detail?: any;
  }

  interface CustomEvent {
    detail: any;
  }

  namespace App {
    type Constructor = (options: any) => void;
    type GetApp = <T = IAppOption>() => T;
  }

  namespace Page {
    type Constructor = (options: any) => void;
    type GetCurrentPages = () => any[];
  }

  namespace Component {
    type Constructor = (options: any) => void;
  }

  namespace Behavior {
    type Constructor = (options: any) => void;
  }
}
