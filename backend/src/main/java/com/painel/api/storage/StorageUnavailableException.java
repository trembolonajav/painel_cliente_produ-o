package com.painel.api.storage;

import com.painel.api.common.ForbiddenException;

public class StorageUnavailableException extends ForbiddenException {
    public StorageUnavailableException(String message) {
        super(message);
    }
}
