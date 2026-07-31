export enum VideoFormat {
  VERTICAL = 'VERTICAL',
  LANDSCAPE = 'LANDSCAPE',
  SQUARE = 'SQUARE',
}

export interface VideoFormatConfig {
  value: VideoFormat;
  label: string;
  desc: string;
  icon: string;
  aspectRatio: string;
  width: number;
  height: number;
}

export const VIDEO_FORMATS: VideoFormatConfig[] = [
  {
    value: VideoFormat.VERTICAL,
    label: '9:16',
    desc: 'TikTok • Shorts • Reels',
    icon: '📱',
    aspectRatio: '9:16',
    width: 1080,
    height: 1920,
  },
  {
    value: VideoFormat.LANDSCAPE,
    label: '16:9',
    desc: 'YouTube',
    icon: '🖥️',
    aspectRatio: '16:9',
    width: 1920,
    height: 1080,
  },
  {
    value: VideoFormat.SQUARE,
    label: '1:1',
    desc: 'Instagram Feed',
    icon: '⬜',
    aspectRatio: '1:1',
    width: 1080,
    height: 1080,
  },
  
  // Reserved for future formats:
  // {
  //   value: 'PORTRAIT', // 4:5
  //   label: '4:5',
  //   desc: 'Instagram Portrait',
  //   icon: '📱',
  //   aspectRatio: '4:5',
  //   width: 1080,
  //   height: 1350,
  // },
  // {
  //   value: 'CINEMATIC', // 21:9
  //   label: '21:9',
  //   desc: 'Cinematic Ultrawide',
  //   icon: '🎬',
  //   aspectRatio: '21:9',
  //   width: 2560,
  //   height: 1080,
  // },
  // {
  //   value: 'CLASSIC', // 3:2
  //   label: '3:2',
  //   desc: 'Classic Photo',
  //   icon: '📸',
  //   aspectRatio: '3:2',
  //   width: 1080,
  //   height: 720,
  // }
];

export function getFormatConfig(format: VideoFormat): VideoFormatConfig {
  return VIDEO_FORMATS.find((f) => f.value === format) || VIDEO_FORMATS[0];
}
