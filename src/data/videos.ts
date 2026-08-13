export interface Video {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export const initialVideos: Video[] = [];

export const loadVideosDatabase = async (): Promise<Video[]> => {
  const mod = await import('./videos.json');
  return mod.default as Video[];
};
