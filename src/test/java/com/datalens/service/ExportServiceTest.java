package com.datalens.service;

import com.datalens.model.Dataset;
import com.datalens.model.AnalysisReport;
import com.datalens.model.AuditLog;
import com.datalens.repository.AnalysisReportRepository;
import com.datalens.repository.AuditLogRepository;
import com.datalens.repository.DatasetRepository;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import java.io.ByteArrayInputStream;
import org.apache.poi.ss.usermodel.WorkbookFactory;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExportServiceTest {
    @Test
    void csvExportProtectsSpreadsheetFormulaCellsAndKeepsNegativeNumbersNumeric() throws Exception {
        DatasetRepository datasets = mock(DatasetRepository.class);
        Dataset dataset = new Dataset("data.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"label\":\"=1+1\",\"amount\":-12}]");
        when(datasets.findById(3L)).thenReturn(Optional.of(dataset));
        ExportService service = new ExportService(datasets, new FileParserService(), mock(AuditLogRepository.class), mock(AnalysisReportRepository.class));

        String csv = new String(service.exportCsv(3L), StandardCharsets.UTF_8);

        assertTrue(csv.startsWith("\uFEFF"));
        assertTrue(csv.contains("'=1+1"));
        assertTrue(csv.contains("-12"));
    }

    @Test
    void excelExportContainsDataAuditAndSummarySheets() throws Exception {
        DatasetRepository datasets = mock(DatasetRepository.class);
        Dataset dataset = new Dataset("data.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"name\":\"Lan\",\"amount\":4}]");
        when(datasets.findById(3L)).thenReturn(Optional.of(dataset));
        ExportService service = new ExportService(datasets, new FileParserService(), mock(AuditLogRepository.class), mock(AnalysisReportRepository.class));

        try (var workbook = WorkbookFactory.create(new ByteArrayInputStream(service.exportExcel(3L)))) {
            assertEquals(5, workbook.getNumberOfSheets());
            assertEquals("Tổng hợp & Biểu đồ", workbook.getSheetAt(3).getSheetName());
            assertEquals("Thống kê & Phân tích", workbook.getSheetAt(4).getSheetName());
            assertEquals(1, ((org.apache.poi.xssf.usermodel.XSSFSheet) workbook.getSheetAt(3))
                    .getDrawingPatriarch().getCharts().size());
            assertEquals("Lan", workbook.getSheetAt(0).getRow(1).getCell(0).getStringCellValue());
        }
    }

    @Test
    void htmlReportIncludesAnalysisContextAuditAndPrintReadyDataset() throws Exception {
        DatasetRepository datasets = mock(DatasetRepository.class);
        Dataset dataset = new Dataset("sales.csv", LocalDateTime.now());
        dataset.setBusinessContext("Bán hàng khu vực");
        dataset.setDataGoal("Theo dõi doanh thu");
        dataset.setRawDataJson("[{\"region\":\"Bắc\",\"sales\":12},{\"region\":\"Nam\",\"sales\":8}]");
        when(datasets.findById(4L)).thenReturn(Optional.of(dataset));

        AnalysisReportRepository reports = mock(AnalysisReportRepository.class);
        AnalysisReport report = new AnalysisReport(4L, "sales", "region",
                "{\"metricCol\":\"sales\",\"categoryCol\":\"region\",\"aggregatedData\":[{\"category\":\"Bắc\",\"value\":12}],\"columnStats\":{\"sales\":{\"mean\":10}},\"insights\":[\"Doanh thu miền Bắc cao hơn\"],\"recommendations\":[\"Theo dõi theo tháng\"]}");
        when(reports.findTopByDatasetIdOrderByCreatedAtDesc(4L)).thenReturn(Optional.of(report));

        AuditLog audit = new AuditLog(4L, 2L, 2, "sales", "7", "8", "Thay giá trị thiếu");
        AuditLogRepository audits = mock(AuditLogRepository.class);
        when(audits.findByDatasetIdOrderByCreatedAtDesc(4L)).thenReturn(List.of(audit));
        ExportService service = new ExportService(datasets, new FileParserService(), audits, reports);

        String html = new String(service.exportHtml(4L), StandardCharsets.UTF_8);
        assertTrue(html.contains("Bán hàng khu vực"));
        assertTrue(html.contains("Kết quả phân tích"));
        assertTrue(html.contains("Doanh thu miền Bắc cao hơn"));
        assertTrue(html.contains("Nhật ký làm sạch &amp; chỉnh sửa"));
        assertTrue(html.contains("In / Lưu PDF"));
        assertTrue(html.contains("sales.csv"));
    }
}
