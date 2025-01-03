interface Credits {
  id: number;
  name: string;
}
interface Platform {
  platform: string;
  location: string;
  credits: [Credits];
}
