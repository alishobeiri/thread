// Images
export const IMG_APNG = "image/apng";
export const IMG_AVIF = "image/avif";
export const IMG_GIF = "image/gif";
export const IMG_SVG = "image/svg+xml";
export const IMG_WEBP = "image/webp";
export const IMG_PNG = "image/png";
export const IMG_JPEG = "image/jpeg";

export const TEXT_HTML = "text/html";
export const TEXT_CSV = "text/csv";
export const TEXT_PLAIN = "text/plain";
export const APPLICATION_JSON = "application/json";
export const APPLICATION_JAVASCRIPT = "application/javascript";
export const SPREADHSEET_MIME_TYPE =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const EXCEL_MIME_TYPE = "application/vnd.ms-excel";
export const APPLICATION_PDF = "application/pdf";
export const LATEX = "text/latex";
export const IMAGE_GIF = "image/gif";

export const PNG_MIME_TYPE = `${IMG_PNG};${TEXT_PLAIN}`;
export const PNG_JPG_MIME_TYPE = `${IMG_JPEG};${IMG_PNG};${TEXT_PLAIN}`;
export const GIF_MIME_TYPE = `${IMAGE_GIF};${TEXT_PLAIN}`;
export const IMG_SVG_TEXT_PLAIN = `${IMG_SVG};${TEXT_PLAIN}`;
export const IMG_PNG_IMG_SVG = `${IMG_PNG};${IMG_SVG}`;
export const IMG_PNG_IMG_SVG_TEXT_PLAIN = `${IMG_PNG};${IMG_SVG};${TEXT_PLAIN}`;

export const APP_JS_MIME_TYPE = `${APPLICATION_JAVASCRIPT};${TEXT_PLAIN}`;
export const TEXT_HTML_TEXT_PLAIN_MIME_TYPE = `${TEXT_HTML};${TEXT_PLAIN}`;

// Need to support this
export const LATEX_DISP_MIME_TYPE = `${LATEX};${TEXT_PLAIN}`;
