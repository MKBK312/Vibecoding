#!/usr/bin/env powershell

# 转换Superpowers技能为Trae IDE格式

# 源目录：Superpowers技能
$sourceDir = "C:\Users\mkbk312\.trae-cn\skills\superpowers\skills"

# 目标目录：Trae全局技能目录
$targetDir = "C:\Users\mkbk312\.trae-cn\skills"

# 技能配置映射
$skillConfig = @{
    "brainstorming" = @{
        name = "brainstorming"
        description = "Use when starting a new project or feature to clarify requirements and explore design options through structured questioning."
        triggers = @("brainstorming", "requirements", "design", "planning", "new project", "feature design")
        role = "facilitator"
        scope = "planning"
        output_format = "structured"
    }
    "dispatching-parallel-agents" = @{
        name = "dispatching-parallel-agents"
        description = "Use when multiple independent tasks can be executed concurrently to improve efficiency."
        triggers = @("parallel tasks", "concurrent execution", "multiple agents", "parallel processing")
        role = "coordinator"
        scope = "execution"
        output_format = "coordination"
    }
    "executing-plans" = @{
        name = "executing-plans"
        description = "Use when following a predefined plan to implement features or fixes step by step."
        triggers = @("execute plan", "implement steps", "follow plan", "task execution")
        role = "implementer"
        scope = "execution"
        output_format = "code"
    }
    "finishing-a-development-branch" = @{
        name = "finishing-a-development-branch"
        description = "Use when completing a development branch, including testing, code review, and merge preparation."
        triggers = @("finish branch", "merge branch", "complete feature", "branch cleanup")
        role = "finisher"
        scope = "completion"
        output_format = "process"
    }
    "receiving-code-review" = @{
        name = "receiving-code-review"
        description = "Use when receiving and addressing code review feedback professionally."
        triggers = @("code review", "review feedback", "address comments", "code review response")
        role = "reviewee"
        scope = "review"
        output_format = "feedback"
    }
    "requesting-code-review" = @{
        name = "requesting-code-review"
        description = "Use when preparing code for review and requesting feedback from peers."
        triggers = @("request review", "code review request", "peer review", "review preparation")
        role = "reviewer"
        scope = "review"
        output_format = "process"
    }
    "subagent-driven-development" = @{
        name = "subagent-driven-development"
        description = "Use when decomposing complex tasks into sub-tasks handled by specialized sub-agents."
        triggers = @("subagent", "delegate tasks", "specialized agents", "task decomposition")
        role = "manager"
        scope = "execution"
        output_format = "coordination"
    }
    "systematic-debugging" = @{
        name = "systematic-debugging"
        description = "Use when troubleshooting bugs through a structured, methodical approach."
        triggers = @("debugging", "bug fixing", "troubleshooting", "error analysis")
        role = "detective"
        scope = "debugging"
        output_format = "analysis"
    }
    "test-driven-development" = @{
        name = "test-driven-development"
        description = "Use when implementing features through the TDD cycle: write failing tests first, then implement code to make them pass."
        triggers = @("TDD", "test-driven development", "write tests", "test first")
        role = "tester"
        scope = "implementation"
        output_format = "code"
    }
    "using-git-worktrees" = @{
        name = "using-git-worktrees"
        description = "Use when working with Git worktrees to manage multiple branches simultaneously."
        triggers = @("git worktree", "branch management", "git workflow", "multiple branches")
        role = "git expert"
        scope = "version control"
        output_format = "process"
    }
    "using-superpowers" = @{
        name = "using-superpowers"
        description = "Use when starting any conversation to establish how to find and use skills effectively."
        triggers = @("superpowers", "skill usage", "workflow", "best practices")
        role = "guide"
        scope = "meta"
        output_format = "guidance"
    }
    "verification-before-completion" = @{
        name = "verification-before-completion"
        description = "Use when verifying that a task is truly complete before marking it as finished."
        triggers = @("verify completion", "final check", "quality assurance", "completion verification")
        role = "verifier"
        scope = "completion"
        output_format = "verification"
    }
    "writing-plans" = @{
        name = "writing-plans"
        description = "Use when creating detailed implementation plans for features or fixes."
        triggers = @("write plan", "implementation plan", "task planning", "project plan")
        role = "planner"
        scope = "planning"
        output_format = "plan"
    }
    "writing-skills" = @{
        name = "writing-skills"
        description = "Use when creating new skills following best practices and TDD methodology."
        triggers = @("write skill", "create skill", "skill development", "skill authoring")
        role = "author"
        scope = "meta"
        output_format = "documentation"
    }
}

# 创建输出目录
if (-not (Test-Path -Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force
}

# 处理每个技能
foreach ($skillName in $skillConfig.Keys) {
    $skillPath = Join-Path -Path $sourceDir -ChildPath $skillName
    $skillFile = Join-Path -Path $skillPath -ChildPath "SKILL.md"
    
    if (Test-Path -Path $skillFile) {
        Write-Host "Processing skill: $skillName"
        
        # 读取原始技能内容
        $content = Get-Content -Path $skillFile -Raw
        
        # 提取原始内容（去掉YAML frontmatter）
        $rawContent = $content -replace '^---[\s\S]*?---\s*', ''
        
        # 获取技能配置
        $config = $skillConfig[$skillName]
        
        # 构建新的YAML frontmatter
        $triggerLines = @()
        foreach ($trigger in $config.triggers) {
            $triggerLines += "  - $trigger"
        }
        $frontmatter = "---`n"
        $frontmatter += "name: $($config.name)`n"
        $frontmatter += "description: $($config.description)`n"
        $frontmatter += "triggers:`n"
        $frontmatter += $triggerLines -join "`n"
        $frontmatter += "`nrole: $($config.role)`n"
        $frontmatter += "scope: $($config.scope)`n"
        $frontmatter += "output-format: $($config.output_format)`n"
        $frontmatter += "---`n`n"
        
        # 构建新的技能内容
        $newContent = $frontmatter + $rawContent
        
        # 写入目标文件
        $targetSkillDir = Join-Path -Path $targetDir -ChildPath $skillName
        if (-not (Test-Path -Path $targetSkillDir)) {
            New-Item -ItemType Directory -Path $targetSkillDir -Force
        }
        
        $targetSkillFile = Join-Path -Path $targetSkillDir -ChildPath "SKILL.md"
        Set-Content -Path $targetSkillFile -Value $newContent -Force
        
        Write-Host "  ✓ Converted and saved to: $targetSkillFile"
    } else {
        Write-Host "  ✗ Skill file not found: $skillFile"
    }
}

Write-Host "`nConversion completed!"
Write-Host "Superpowers skills have been converted to Trae IDE format and saved to:"
Write-Host $targetDir