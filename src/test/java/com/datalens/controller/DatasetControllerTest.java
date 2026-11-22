package com.datalens.controller;

import com.datalens.model.Dataset;
import com.datalens.model.CleaningSession;
import com.datalens.repository.AnalysisReportRepository;
import com.datalens.repository.AuditLogRepository;
import com.datalens.repository.CleaningSessionRepository;
import com.datalens.repository.DatasetRepository;
import com.datalens.service.FileParserService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

class DatasetControllerTest {
    @Test
    void inlineCellEditPersistsValueAndAuditEntry() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        AuditLogRepository audits = mock(AuditLogRepository.class);
        CleaningSessionRepository sessions = mock(CleaningSessionRepository.class);
        AnalysisReportRepository reports = mock(AnalysisReportRepository.class);
        FileParserService parser = new FileParserService();
        Dataset dataset = new Dataset("sales.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"region\":\"North\",\"revenue\":1200.0}]");
        dataset.setColumnNamesJson("[\"region\",\"revenue\"]");
        dataset.setStatus("UPLOADED");
        when(datasets.findById(7L)).thenReturn(Optional.of(dataset));
        when(sessions.findTopByDatasetIdOrderByStartedAtDesc(7L)).thenReturn(Optional.empty());
        when(sessions.save(any(CleaningSession.class))).thenAnswer(invocation -> {
            CleaningSession session = invocation.getArgument(0);
            session.setId(12L);
            return session;
        });

        DatasetController controller = new DatasetController(datasets, parser, audits, sessions, reports);
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("rowNumber", 1);
        request.put("columnName", "revenue");
        request.put("value", "1450.5");
        var response = controller.updateCell(7L, request);

        assertEquals(200, response.getStatusCode().value());
        List<Map<String, Object>> updatedRows = parser.fromJson(dataset.getRawDataJson());
        assertEquals(1450.5, ((Number) updatedRows.get(0).get("revenue")).doubleValue());
        assertEquals("CLEANED", dataset.getStatus());
        verify(audits).save(argThat(log -> log.getSessionId().equals(12L)
                && log.getRowNumber().equals(1)
                && log.getColumnName().equals("revenue")
                && log.getChangeReason().equals("MANUAL_EDIT")));
        verify(reports).deleteByDatasetId(7L);
    }

    @Test
    void inlineCellEditRejectsUnknownColumn() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        Dataset dataset = new Dataset("sales.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"region\":\"North\"}]");
        dataset.setColumnNamesJson("[\"region\"]");
        when(datasets.findById(7L)).thenReturn(Optional.of(dataset));
        DatasetController controller = new DatasetController(datasets, new FileParserService(),
                mock(AuditLogRepository.class), mock(CleaningSessionRepository.class), mock(AnalysisReportRepository.class));

        var response = controller.updateCell(7L, Map.of("rowNumber", 1, "columnName", "missing", "value", "x"));

        assertEquals(400, response.getStatusCode().value());
        verify(datasets, never()).save(any(Dataset.class));
    }
}
