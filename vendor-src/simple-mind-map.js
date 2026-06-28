import MindMap from "simple-mind-map/full";
import "simple-mind-map/dist/simpleMindMap.esm.min.css";
import Themes from "simple-mind-map-plugin-themes";
import themeList from "simple-mind-map-plugin-themes/themeList";

Themes.init(MindMap);
window.SimpleMindMap = MindMap;
window.SimpleMindMapThemeList = themeList.map(({ name, value, dark }) => ({ name, value, dark }));
window.SimpleMindMapThemeConfigs = Object.fromEntries(themeList.map(({ value, theme }) => [value, theme]));
