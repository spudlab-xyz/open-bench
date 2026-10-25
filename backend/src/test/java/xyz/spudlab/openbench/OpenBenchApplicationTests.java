package xyz.spudlab.openbench;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.NONE,
        properties = {
                "DB_HOST=127.0.0.1",
                "DB_PORT=1",
                "DB_NAME=openbench_test",
                "DB_USER=openbench_test",
                "DB_PASSWORD=test-only"
        })
class OpenBenchApplicationTests {

    @Test
    void applicationContextStarts() {
    }
}
