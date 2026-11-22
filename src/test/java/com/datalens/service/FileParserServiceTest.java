package com.datalens.service;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import static org.junit.jupiter.api.Assertions.*;

class FileParserServiceTest {
    private final FileParserService parser = new FileParserService();

    @Test
    void parsesUtf8BomAndQuotedDelimiter() throws Exception {
        String csv = "\uFEFFname,notes,total\r\nLan,\"North, branch\",12\r\n";
        MockMultipartFile file = new MockMultipartFile("file", "sales.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        FileParserService.ParseResult result = parser.parse(file);

        assertEquals("name", result.columns.get(0));
        assertEquals("North, branch", result.rows.get(0).get("notes"));
        assertEquals(12L, result.rows.get(0).get("total"));
    }

    @Test
    void rejectsUnsupportedFileType() {
        MockMultipartFile file = new MockMultipartFile("file", "data.exe", "application/octet-stream", new byte[]{1});
        assertThrows(IllegalArgumentException.class, () -> parser.parse(file));
    }

    @Test
    void readsTheRequestedExcelSheetAndRejectsUnknownSheet() throws Exception {
        byte[] workbookBytes;
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            var first = workbook.createSheet("Jan");
            first.createRow(0).createCell(0).setCellValue("value");
            first.createRow(1).createCell(0).setCellValue(1);
            var second = workbook.createSheet("Feb");
            second.createRow(0).createCell(0).setCellValue("value");
            second.createRow(1).createCell(0).setCellValue(2);
            workbook.write(out);
            workbookBytes = out.toByteArray();
        }
        MockMultipartFile file = new MockMultipartFile("file", "sales.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", workbookBytes);

        FileParserService.ParseResult result = parser.parse(file, null, "Feb");
        assertEquals("Feb", result.sheetName);
        assertEquals(2L, ((Number) result.rows.get(0).get("value")).longValue());
        assertThrows(IllegalArgumentException.class, () -> parser.parse(file, null, "Missing"));
    }
}
