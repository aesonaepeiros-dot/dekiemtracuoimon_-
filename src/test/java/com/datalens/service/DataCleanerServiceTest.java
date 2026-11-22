package com.datalens.service;

import com.datalens.dto.CleanRequestDto;
import com.datalens.model.CleaningSession;
import com.datalens.model.Dataset;
import com.datalens.repository.AuditLogRepository;
import com.datalens.repository.CleaningSessionRepository;
import com.datalens.repository.DatasetRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DataCleanerServiceTest {
    @Test
    void standardizingTextPreservesCodesAndExistingNameCase() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        CleaningSessionRepository sessions = mock(CleaningSessionRepository.class);
        AuditLogRepository audits = mock(AuditLogRepository.class);
        FileParserService parser = new FileParserService();
        Dataset dataset = new Dataset("source.csv", LocalDateTime.now());
        dataset.setSourceDataJson("[{\"region\":\"Miền Bắc\",\"code\":\"DH001\"}]");
        dataset.setRawDataJson(dataset.getSourceDataJson());
        when(datasets.findById(1L)).thenReturn(Optional.of(dataset));
        when(sessions.save(any(CleaningSession.class))).thenAnswer(invocation -> invocation.getArgument(0));
        DataCleanerService service = new DataCleanerService(datasets, sessions, audits, parser);
        CleanRequestDto request = new CleanRequestDto();
        request.setTrimWhitespace(false);
        request.setRemoveDuplicates(false);
        request.setStandardizeText(true);
        request.setFillMissingWithMean(false);
        request.setFillMissingWithMedian(false);
        request.setRemoveMissingRows(false);
        request.setDetectOutliers(false);

        service.clean(1L, request);

        var row = parser.fromJson(dataset.getRawDataJson()).get(0);
        assertEquals("Miền Bắc", row.get("region"));
        assertEquals("DH001", row.get("code"));
        verify(audits, never()).saveAll(any());
    }

    @Test
    void repeatedCleaningStartsFromImmutableUploadSnapshot() {
        DatasetRepository datasets = mock(DatasetRepository.class);
        CleaningSessionRepository sessions = mock(CleaningSessionRepository.class);
        AuditLogRepository audits = mock(AuditLogRepository.class);
        FileParserService parser = new FileParserService();
        Dataset dataset = new Dataset("source.csv", LocalDateTime.now());
        dataset.setSourceDataJson("[{\"name\":\"  mai  \"}]");
        dataset.setRawDataJson("[{\"name\":\"Mai\"}]");
        when(datasets.findById(1L)).thenReturn(Optional.of(dataset));
        when(sessions.save(any(CleaningSession.class))).thenAnswer(invocation -> {
            CleaningSession session = invocation.getArgument(0);
            session.setId(11L);
            return session;
        });
        DataCleanerService service = new DataCleanerService(datasets, sessions, audits, parser);
        CleanRequestDto request = new CleanRequestDto();
        request.setRemoveDuplicates(false);
        request.setTrimWhitespace(true);
        request.setStandardizeText(false);
        request.setDetectOutliers(false);
        request.setFillMissingWithMean(false);
        request.setFillMissingWithMedian(false);
        request.setRemoveMissingRows(false);

        service.clean(1L, request);
        assertTrue(dataset.getRawDataJson().contains("mai"));
        service.clean(1L, request);
        assertTrue(dataset.getRawDataJson().contains("mai"));
        assertEquals("[{\"name\":\"  mai  \"}]", dataset.getSourceDataJson());
    }
}
