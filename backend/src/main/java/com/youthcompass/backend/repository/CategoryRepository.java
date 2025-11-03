package com.youthcompass.backend.repository;

import com.youthcompass.backend.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * 활성화된 카테고리만 조회
     */
    List<Category> findByCategoryIsActiveTrue();

    /**
     * 카테고리명으로 조회
     */
    Category findByCategoryName(String categoryName);
}
