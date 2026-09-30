import { d2Get } from "./d2api.js";


function parseServerVersion(versionString) {
    const snapshot = versionString.includes("SNAPSHOT");
    const cleanedVersion = versionString.replace("-SNAPSHOT", "");
    const [majorStr, minorStr, patchStr = "0"] = cleanedVersion.split(".");

    return {
        major: parseInt(majorStr, 10),
        minor: parseInt(minorStr, 10),
        patch: parseInt(patchStr, 10),
        snapshot
    };
}

async function shouldLoadLegacyHeaderBar() {
    try {
        const response = await d2Get("api/system/info.json?fields=version");
        const versionInfo = parseServerVersion(response.version || "0.0.0");
        // DHIS2 reports versions as "2.41.x". Should DHIS2 ever drop the "2."
        // prefix ("43.0"), the major becomes the release number — treat that as
        // 2.42+ rather than falling back to the legacy header bar.
        if (versionInfo.major > 2) return false;
        return versionInfo.minor < 42;
    } catch (error) {
        console.error("Error fetching server version:", error);
        return true;
    }
}

export async function loadLegacyHeaderBarIfNeeded() {
    const shouldLoad = await shouldLoadLegacyHeaderBar();
    if (shouldLoad) {
        const script = document.createElement("script");
        script.src = "resources/dhis-header-bar.js";
        script.defer = true;
        document.head.appendChild(script);
    } else {
        const headerBar = document.getElementById("dhis-header-bar");
        if (headerBar) headerBar.style.display = "none";
    }
}