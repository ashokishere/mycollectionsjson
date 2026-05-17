import videosData from './videos.json';

export interface Video {
  id: string;
  title: string;
  url: string;
  tags: string[];
}

export const initialVideos: Video[] = videosData as Video[];
