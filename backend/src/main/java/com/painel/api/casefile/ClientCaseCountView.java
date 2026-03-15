package com.painel.api.casefile;

import java.util.UUID;

public interface ClientCaseCountView {
    UUID getClientId();
    long getCaseCount();
}
