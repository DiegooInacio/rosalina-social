package br.org.rosalina.social.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.support.OpenEntityManagerInViewFilter;

/** Keeps the persistence context available until DTO mapping finishes in MVC controllers. */
@Configuration
class EntityManagerRequestConfig {
  @Bean FilterRegistrationBean<OpenEntityManagerInViewFilter> entityManagerInViewFilter() {
    OpenEntityManagerInViewFilter filter = new OpenEntityManagerInViewFilter();
    filter.setEntityManagerFactoryBeanName("entityManagerFactory");
    FilterRegistrationBean<OpenEntityManagerInViewFilter> registration = new FilterRegistrationBean<>(filter);
    registration.setOrder(Integer.MIN_VALUE);
    return registration;
  }
}
