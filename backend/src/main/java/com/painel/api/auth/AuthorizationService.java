package com.painel.api.auth;

import com.painel.api.casefile.CaseMemberPermission;
import com.painel.api.casefile.CaseMemberRepository;
import com.painel.api.common.ForbiddenException;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuthorizationService {

    private final CaseMemberRepository caseMemberRepository;

    public AuthorizationService(CaseMemberRepository caseMemberRepository) {
        this.caseMemberRepository = caseMemberRepository;
    }

    public boolean isAdmin(OfficeUser user) {
        return user.getRole() == OfficeRole.ADMINISTRADOR;
    }

    public void requireAnyRole(OfficeUser user, OfficeRole... roles) {
        for (OfficeRole role : roles) {
            if (user.getRole() == role) {
                return;
            }
        }
        throw new ForbiddenException("Sem permissao para esta acao");
    }

    public void requireCaseReadAccess(OfficeUser user, UUID caseId) {
        if (isAdmin(user) || caseMemberRepository.existsByCaseFile_IdAndUser_Id(caseId, user.getId())) {
            return;
        }
        throw new ForbiddenException("Sem acesso a este caso");
    }

    public void requireCaseWriteAccess(OfficeUser user, UUID caseId) {
        if (isAdmin(user)) {
            return;
        }
        var permission = caseMemberRepository.findByCaseFile_IdAndUser_Id(caseId, user.getId())
                .map(member -> member.getPermission())
                .orElseThrow(() -> new ForbiddenException("Sem acesso a este caso"));

        if (permission == CaseMemberPermission.OWNER || permission == CaseMemberPermission.EDITOR) {
            return;
        }
        throw new ForbiddenException("Sem permissao de edicao neste caso");
    }

    public void requireCaseOwnerOrAdmin(OfficeUser user, UUID caseId) {
        if (isAdmin(user)) {
            return;
        }
        var permission = caseMemberRepository.findByCaseFile_IdAndUser_Id(caseId, user.getId())
                .map(member -> member.getPermission())
                .orElseThrow(() -> new ForbiddenException("Sem acesso a este caso"));
        if (permission != CaseMemberPermission.OWNER) {
            throw new ForbiddenException("Apenas proprietario do caso pode gerenciar membros");
        }
    }
}
