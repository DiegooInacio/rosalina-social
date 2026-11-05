package br.org.rosalina.social.config;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@Profile("heroku")
class FrontendController {
  @GetMapping({"/login", "/app", "/app/**"})
  String application() { return "forward:/index.html"; }
}
