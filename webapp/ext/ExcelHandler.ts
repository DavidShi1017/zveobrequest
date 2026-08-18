import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import Context from "sap/ui/model/odata/v4/Context";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";

// Service schema namespace (from $metadata) — needed to address the bound fillFromExcel action.
const NS = "com.sap.gateway.srvd.zui_vo_myreq.v0001";

// Root supplier/address fields the import writes — re-read after the action to refresh the form.
// ZAPP_VO field model: no Street2/3, Country (not SupplierCountry), Uen (not TaxNumber).
const REFRESH_FIELDS = [
    "SupplierName", "Street", "HouseNumber", "PostalCode",
    "City", "Region", "Country", "Email", "ContactNumber", "Uen"
];

/**
 * "Download Template" — download the blank BusinessPartner_TKG template that ships as a static
 * asset of this app (webapp/ext/BusinessPartner_TKG_template.xlsx). The requestor fills sheet
 * "Sheet1" (values in column E) and uploads it again.
 */
export function onDownloadTemplate(): void {
    // Resolve the bundled asset URL via the UI5 loader.
    const sUrl = (sap as unknown as { ui: { require: { toUrl(m: string): string } } })
        .ui.require.toUrl("zveobrequest/ext/BusinessPartner_TKG_template.xlsx");
    const oLink = document.createElement("a");
    oLink.href = sUrl;
    oLink.download = "BusinessPartner_TKG_template.xlsx";
    document.body.appendChild(oLink);
    oLink.click();
    document.body.removeChild(oLink);
}

/**
 * "Upload Excel" — pick a filled BusinessPartner_TKG template and fill the CURRENT draft's fields
 * from it (fillFromExcel action: parses the sheet, updates the supplier/address fields and replaces
 * the bank row). `this` is the FE V4 ObjectPage ExtensionAPI (getBindingContext).
 */
export function onUploadExcel(this: { getBindingContext: () => Context }): void {
    const oCtx = this.getBindingContext();
    const oInput = document.createElement("input");
    oInput.type = "file";
    oInput.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    oInput.onchange = () => {
        const oFile = oInput.files && oInput.files[0];
        if (!oFile) {
            return;
        }
        const sFileName = oFile.name;
        const oReader = new FileReader();
        oReader.onload = () => {
            // readAsDataURL yields "data:<mime>;base64,<payload>" — keep just the base64 payload.
            const sResult = oReader.result as string;
            const sBase64 = sResult.substring(sResult.indexOf(",") + 1);
            void importTemplate(oCtx, sFileName, sBase64);
        };
        oReader.readAsDataURL(oFile);
    };
    oInput.click();
}

async function importTemplate(oCtx: Context, sFileName: string, sBase64: string): Promise<void> {
    const oModel = oCtx.getModel() as ODataModel;
    BusyIndicator.show(0);
    try {
        const oOperation = oModel.bindContext(`${NS}.uploadTemplate(...)`, oCtx) as ODataContextBinding;
        // Backend action uploadTemplate: FileName (mandatory) + Content (base64 Edm.Binary).
        oOperation.setParameter("FileName", sFileName);
        oOperation.setParameter("Content", sBase64);
        await oOperation.invoke();

        // Refresh the form fields + bank table with the values the action just wrote.
        await oCtx.requestSideEffects([...REFRESH_FIELDS, { $NavigationPropertyPath: "_Bank" }]);
        BusyIndicator.hide();
        MessageToast.show("Template imported — fields updated.");
    } catch (e) {
        BusyIndicator.hide();
        MessageBox.error(
            "Could not import the template:\n" +
                ((e as { message?: string })?.message ?? String(e))
        );
    }
}
