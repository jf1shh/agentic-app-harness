package com.harness.eldercareplanner;

import org.junit.Test;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.File;
import java.nio.file.Path;
import static org.junit.Assert.assertTrue;

/** Verify the exclusion resolves to the actual WebView tree, not files/app_webview. */
public class BackupRulesTest {
    private static final Path APP_ROOT = Path.of("/data/user/0/com.harness.eldercareplanner");

    private Element rules(String file) throws Exception {
        return DocumentBuilderFactory.newInstance().newDocumentBuilder()
            .parse(new File("src/main/res/xml/" + file)).getDocumentElement();
    }

    private boolean excludesWebView(Element section) {
        Path storedPlan = APP_ROOT.resolve("app_webview/Default/Local Storage/leveldb/000001.log");
        Path storedPhoto = APP_ROOT.resolve("app_webview/Default/IndexedDB/photos/blob");
        NodeList exclusions = section.getElementsByTagName("exclude");
        for (int i = 0; i < exclusions.getLength(); i++) {
            Element exclusion = (Element) exclusions.item(i);
            Path base;
            switch (exclusion.getAttribute("domain")) {
                case "root": base = APP_ROOT; break;
                case "file": base = APP_ROOT.resolve("files"); break;
                default: continue;
            }
            Path excluded = base.resolve(exclusion.getAttribute("path")).normalize();
            if (storedPlan.startsWith(excluded) && storedPhoto.startsWith(excluded)) return true;
        }
        return false;
    }

    @Test public void givenLegacyBackup_whenResolvingExclusions_thenPlanAndPhotosStayExcluded() throws Exception {
        assertTrue("Legacy backup must exclude the real WebView directory", excludesWebView(rules("backup_rules.xml")));
    }

    @Test public void givenCloudBackup_whenResolvingExclusions_thenPlanAndPhotosStayExcluded() throws Exception {
        Element cloud = (Element) rules("data_extraction_rules.xml").getElementsByTagName("cloud-backup").item(0);
        assertTrue("Cloud backup must exclude the real WebView directory", excludesWebView(cloud));
    }

    @Test public void givenDeviceTransfer_whenResolvingExclusions_thenPlanAndPhotosStayExcluded() throws Exception {
        Element transfer = (Element) rules("data_extraction_rules.xml").getElementsByTagName("device-transfer").item(0);
        assertTrue("Device transfer must exclude the real WebView directory", excludesWebView(transfer));
    }
}
