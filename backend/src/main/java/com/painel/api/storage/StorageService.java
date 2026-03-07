package com.painel.api.storage;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class StorageService {

    private static final Pattern SAFE_FILENAME = Pattern.compile("[^a-zA-Z0-9._-]");

    private final StorageProperties properties;
    private final ObjectProvider<S3Presigner> presignerProvider;

    public StorageService(StorageProperties properties, ObjectProvider<S3Presigner> presignerProvider) {
        this.properties = properties;
        this.presignerProvider = presignerProvider;
    }

    public PresignedUpload createUploadUrl(UUID caseId, String originalName, String mimeType) {
        S3Presigner presigner = requirePresigner();
        String storageKey = buildStorageKey(caseId, originalName);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(properties.bucket())
                .key(storageKey)
                .contentType(mimeType)
                .build();

        Duration duration = Duration.ofMinutes(properties.uploadUrlMinutes());
        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(duration)
                .putObjectRequest(putObjectRequest)
                .build();

        var presigned = presigner.presignPutObject(presignRequest);
        return new PresignedUpload(
                presigned.url().toString(),
                storageKey,
                OffsetDateTime.now().plus(duration),
                "PUT",
                mimeType);
    }

    public String createDownloadUrl(String storageKey) {
        S3Presigner presigner = requirePresigner();

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(properties.bucket())
                .key(storageKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(properties.downloadUrlMinutes()))
                .getObjectRequest(getObjectRequest)
                .build();

        return presigner.presignGetObject(presignRequest).url().toString();
    }

    private S3Presigner requirePresigner() {
        if (!properties.enabled()) {
            throw new StorageUnavailableException("Storage externo desabilitado");
        }
        S3Presigner presigner = presignerProvider.getIfAvailable();
        if (presigner == null) {
            throw new StorageUnavailableException("Storage externo nao inicializado");
        }
        return presigner;
    }

    private String buildStorageKey(UUID caseId, String originalName) {
        String safeName = sanitizeFilename(originalName);
        return "cases/" + caseId + "/" + UUID.randomUUID() + "-" + safeName;
    }

    private String sanitizeFilename(String filename) {
        String fallback = "arquivo.bin";
        if (filename == null || filename.isBlank()) {
            return fallback;
        }
        String sanitized = SAFE_FILENAME.matcher(filename.trim()).replaceAll("_");
        return sanitized.isBlank() ? fallback : sanitized;
    }
}
