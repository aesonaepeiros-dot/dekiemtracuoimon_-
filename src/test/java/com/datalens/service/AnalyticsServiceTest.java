package com.datalens.service;

import com.datalens.dto.AnalysisResponseDto;
import com.datalens.model.Dataset;
import com.datalens.repository.AnalysisReportRepository;
import com.datalens.repository.DatasetRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {
    @Test
    void appliesDateRangeAndCreatesChronologicalTrend() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        AnalysisReportRepository reports = mock(AnalysisReportRepository.class);
        FileParserService parser = new FileParserService();
        Dataset dataset = new Dataset("sales.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"date\":\"2024-01-03\",\"sales\":3},{\"date\":\"2024-01-01\",\"sales\":1},{\"date\":\"2024-01-02\",\"sales\":2}]");
        when(datasets.findById(7L)).thenReturn(Optional.of(dataset));

        AnalyticsService service = new AnalyticsService(datasets, reports, parser);
        AnalysisResponseDto result = service.analyze(7L, "sales", "date", "date", "2024-01-02", "2024-01-03", null);

        assertEquals("2024-01-02", result.getTrendData().get(0).get("category"));
        assertEquals(2, result.getTrendData().size());
        assertEquals("2024-01-02", result.getFromDate());
        verify(reports).save(any());
        verify(datasets).save(dataset);
    }

    @Test
    void rejectsNonNumericMetricSelection() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        Dataset dataset = new Dataset("sales.csv", LocalDateTime.now());
        dataset.setRawDataJson("[{\"category\":\"A\",\"sales\":1}]");
        when(datasets.findById(1L)).thenReturn(Optional.of(dataset));
        AnalyticsService service = new AnalyticsService(datasets, mock(AnalysisReportRepository.class), new FileParserService());
        assertThrows(IllegalArgumentException.class, () -> service.analyze(1L, "category", null));
    }
}
