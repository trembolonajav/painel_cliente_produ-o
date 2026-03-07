package com.painel.api.document;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/documents")
public class DocumentDownloadController {

    private final DocumentDownloadService documentDownloadService;

    public DocumentDownloadController(DocumentDownloadService documentDownloadService) {
        this.documentDownloadService = documentDownloadService;
    }

    @GetMapping("/download")
    @ResponseStatus(HttpStatus.OK)
    public DocumentDownloadResolveResponse resolve(@RequestParam String token) {
        return documentDownloadService.resolve(token);
    }
}
