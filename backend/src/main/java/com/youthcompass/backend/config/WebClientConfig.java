package com.youthcompass.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * WebClient 설정
 * 비동기 HTTP 클라이언트로 스트리밍 채팅 등에 사용됩니다.
 */
@Configuration
public class WebClientConfig {

    /**
     * WebClient 빈 등록
     * AI 서비스 스트리밍 호출 등 비동기 API 통신에 사용됩니다.
     *
     * @return 설정된 WebClient 인스턴스
     */
    @Bean
    public WebClient webClient() {
        return WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)) // 10MB
                .build();
    }
}

