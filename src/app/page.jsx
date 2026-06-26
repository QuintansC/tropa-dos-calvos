import App from "../App.jsx";
import { loadAppProps } from "./load-app-props.js";

export const dynamic = "force-dynamic";

export default async function Home() {
  const props = await loadAppProps();
  return <App {...props} page="home" />;
}
