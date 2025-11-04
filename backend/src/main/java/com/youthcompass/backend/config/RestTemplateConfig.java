package com.youthcompass.backend.config;

import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * RestTemplate 설정
 * HTTP 클라이언트로 외부 API 호출 시 사용됩니다.
 */
@Configuration
public class RestTemplateConfig {

    /**
     * RestTemplate 빈 등록
     * AI 서비스 호출 등 외부 API 통신에 사용됩니다.
     *
     * @param builder RestTemplateBuilder (Spring Boot에서 자동 제공)
     * @return 설정된 RestTemplate 인스턴스
     */
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
                .connectTimeout(Duration.ofSeconds(10))  // 연결 타임아웃: 10초
                .readTimeout(Duration.ofSeconds(30))     // 읽기 타임아웃: 30초
        .build();
    }
}
