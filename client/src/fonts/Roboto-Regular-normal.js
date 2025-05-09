/**
 * Türkçe karakter desteği için Roboto fontunu jsPDF'e ekler
 * Generated from https://gero3.github.io/fpe-generator/
 */
(function(jsPDFAPI) {
  "use strict";

  var font = 'AAEAAAASAQAABAAgR0RFRgAOAAgAAAEsAAAAJEdQT1MF4QU1AAABUAAAAWxHU1VCkw2CAgAAArg...';
  // Burada uzun base64 font kodu olacak - kesildikten sonra
  // Orijinal font dosyasının tam çıktısı buraya gelmeli

  jsPDFAPI.addFileToVFS('Roboto-Regular.ttf', font);
  jsPDFAPI.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
})(jsPDF.API);