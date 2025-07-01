# Decision Log

## Decision 1
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## Decision 2
- **Date:** [Date]
- **Context:** [Context]
- **Decision:** [Decision]
- **Alternatives Considered:** [Alternatives]
- **Consequences:** [Consequences]

## Rate Limiting Strategy for Bulk File Uploads
- **Date:** 2025-06-30 3:40:56 PM
- **Author:** Unknown User
- **Context:** Users need to upload 70+ trio files simultaneously for equipment mapping. Original rate limit of 10 requests/minute was causing immediate 429 errors and failed uploads.
- **Decision:** Implemented dual approach: 1) Increased server-side rate limit to 50 requests/minute, 2) Increased client-side delay between uploads to 2 seconds
- **Alternatives Considered:** 
  - Remove rate limiting entirely
  - Implement queue-based uploads
  - Use single file upload with batch processing
  - Implement sliding window rate limiting
- **Consequences:** 
  - Better user experience for bulk uploads
  - Maintains protection against API abuse
  - Slightly longer total upload time but reliable success
  - Clear debugging visibility into rate limiting

## Migration from In-Memory to MySQL Database Storage
- **Date:** 2025-06-30 3:47:07 PM
- **Author:** Unknown User
- **Context:** Application currently uses in-memory storage for processed equipment and points. User needs to integrate with local CxAlloy MySQL database to complete the mapping workflow back to CxAlloy equipment and points.
- **Decision:** Replace in-memory storage with MySQL database backend while maintaining file processing pipeline. Keep in-memory processing during file operations but persist results to database for mapping integration.
- **Alternatives Considered:** 
  - Keep in-memory storage with export functionality
  - Use separate database for mapping data
  - Implement hybrid approach with both in-memory and database
  - Use SQLite for simpler local development
- **Consequences:** 
  - Better data persistence and reliability
  - Integration with existing CxAlloy database structure
  - More complex setup and configuration
  - Better scalability for production use
  - Enables proper mapping workflow completion

## MySQL Database Integration Strategy
- **Date:** 2025-06-30 6:52:03 PM
- **Author:** Unknown User
- **Context:** User provided CxAlloy database schema and credentials, with strict requirement not to modify existing database structure. Needed to integrate equipment mapping system with existing production database.
- **Decision:** Implemented additive database strategy: created new supplementary tables (equipment_mapping, point_mapping, mapping_sessions) alongside existing CxAlloy schema without modifications. Used existing CxAlloy database connection (localhost:3306, root/567eight, cxalloytq) with connection pooling and proper error handling.
- **Alternatives Considered:** 
  - Create separate database for equipment mapping
  - Use file-based storage
  - Modify existing CxAlloy tables (rejected due to user constraint)
- **Consequences:** 
  - Maintains CxAlloy production stability
  - Enables seamless integration with existing workflows
  - Requires careful data consistency management
  - Allows independent development and deployment

## TypeScript Interface Unification Strategy
- **Date:** 2025-06-30 6:52:14 PM
- **Author:** Unknown User
- **Context:** Multiple NormalizedPoint interfaces existed across the codebase causing compilation conflicts. Database service expected different properties than UI components, creating type mismatches and build failures.
- **Decision:** Unified on comprehensive NormalizedPoint interface from types/normalized.ts, removed duplicate interface from types/equipment.ts, and updated all imports across codebase. Updated database service and processing service to properly map between database records and interface requirements.
- **Alternatives Considered:** 
  - Keep separate interfaces and use type casting
  - Create adapter functions between interfaces
  - Simplify to lowest common denominator interface
- **Consequences:** 
  - Single source of truth for point data structure
  - Type safety maintained throughout application
  - Database service properly typed
  - Eliminates compilation errors and improves maintainability

## Database Integration Strategy - Additive Approach
- **Date:** 2025-07-01 8:22:21 PM
- **Author:** Unknown User
- **Context:** The CxAlloy Equipment Mapping System needed to integrate with an existing CxAlloy MySQL database while respecting the constraint of not modifying existing tables. The user provided the CxAlloy database schema and emphasized that only additive changes were allowed.
- **Decision:** Implemented an additive database strategy using three new supplementary tables (equipment_mapping, point_mapping, mapping_sessions) alongside the existing CxAlloy schema without any modifications to existing tables. Used proper ENUM mapping functions to convert application data types to database-compatible values, and implemented comprehensive error handling with fallback to in-memory storage if database operations fail.
- **Alternatives Considered:** 
  - Modify existing CxAlloy tables directly (rejected due to user constraint)
  - Use a separate database instance (rejected to maintain integration)
  - Use only in-memory storage (rejected for persistence requirements)
- **Consequences:** 
  - ✅ Maintains compatibility with existing CxAlloy system
  - ✅ Provides persistent storage for equipment mappings
  - ✅ Allows for future expansion without breaking changes
  - ✅ Clean separation between CxAlloy core data and mapping data
  - ⚠️ Requires careful maintenance of ENUM mappings between systems

## Enhanced Point Normalization Configuration
- **Date:** 2025-07-01 1:33:48 AM
- **Author:** Unknown User
- **Context:** During implementation of the enhanced point normalization system, we discovered that the new features (adding "Sensor" suffixes and enhanced confidence levels) would break existing tests while providing more accurate results.
- **Decision:** Implemented configurable enhancement options in NormalizationContext interface with backward compatibility flags: `addFunctionSuffix` and `useEnhancedConfidence`. New processing pipeline uses enhanced mode by default, while existing code can maintain legacy behavior.
- **Alternatives Considered:** 
  - Completely replace old system (breaking changes)
  - Create separate enhanced normalizer class
  - Make enhancements optional through global config
- **Consequences:** 
  - Maintains backward compatibility with existing codebase
  - Allows gradual migration to enhanced features
  - Enables A/B testing of normalization approaches
  - Adds slight complexity to configuration interface
