export const english: Record<string, string> = {
  개: 'files',
  쌍: 'pairs',
  건: 'items',
  '매일 새벽 운영 파일을 백업합니다.': 'Backs up operational files each night.',
  '사용자 목록을 내부 보고용 파일로 내보냅니다.': 'Exports user listings for internal reporting.',
  '보관 기간이 지난 합성 로그를 정리하는 예제입니다.':
    'A sample that cleans up expired synthetic logs.',
  '보고서 폴더를 동기화하는 예제 작업입니다.': 'A sample task that synchronizes report folders.',
  '서버의 기본 자산 정보를 수집합니다.': 'Collects basic server inventory information.',
  '호출 경로가 동적으로 구성되어 추가 확인이 필요합니다.':
    'The invocation path is constructed dynamically and needs further review.',
  '작업 폴더가 다릅니다': 'Working directories differ',
  '수동 기준은 D:\\Ops\\Scripts, 예약 실행은 C:\\Windows\\System32에서 수집됐습니다. 상대 경로로 읽는 설정 파일이 있다면 영향을 받을 수 있습니다.':
    'The manual context was captured in D:\\Ops\\Scripts and the scheduled context in C:\\Windows\\System32. Configuration files read using relative paths may be affected.',
  'backup.ps1에서 상대 경로를 사용하는지 확인하고 진단용 작업의 작업 폴더를 비교하세요.':
    'Check relative paths in backup.ps1 and compare the diagnostic task working directory.',
  '수동 기준 작업 폴더: D:\\Ops\\Scripts': 'Manual working directory · D:\\Ops\\Scripts',
  '예약 실행 작업 폴더: C:\\Windows\\System32':
    'Scheduled working directory · C:\\Windows\\System32',
  '환경 차이는 관측했지만 업무 스크립트의 실패 원인은 확정하지 않았습니다.':
    'Environment differences were observed. Their relationship to the script failure needs further evidence.',
  '실행 엔진이 다릅니다': 'Execution engines differ',
  '수동 기준은 PowerShell 7, 예약 실행은 Windows PowerShell 5.1을 사용합니다.':
    'The manual context uses PowerShell 7 and the scheduled context uses Windows PowerShell 5.1.',
  '스크립트와 모듈이 지원하는 PowerShell 버전을 확인하세요.':
    'Check which PowerShell versions the script and modules support.',
  '수동 기준: C:\\Program Files\\PowerShell\\7\\pwsh.exe / 7.6.3':
    'Manual · C:\\Program Files\\PowerShell\\7\\pwsh.exe / 7.6.3',
  '예약 실행: C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe / 5.1.20348.2849':
    'Scheduled · C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe / 5.1.20348.2849',
  '계정별 모듈 경로를 확인하세요': 'Review per-account module paths',
  '사용자 모듈 경로가 예약 실행의 검색 경로에 포함되지 않은 합성 사례입니다. 모듈 Import 성공 여부는 확인하지 않았습니다.':
    'This sample omits the user module directory from the scheduled search paths. Module import results need separate verification.',
  '실행 계정의 PSModulePath와 명시된 모듈 의존성을 비교하세요.':
    "Compare the execution account's PSModulePath and declared module dependencies.",
  '수동 기준에만 사용자 모듈 경로가 있습니다.':
    'The user module directory appears only in the manual context.',
  '모듈을 자동으로 불러오거나 설치하지 않았습니다.':
    'Module loading and installation results were not collected.',
  '대상 계정의 접근 여부가 미확인입니다': 'Target account access is unknown',
  '계정과 작업 설정만으로 네트워크 자원의 실제 접근 권한을 확인할 수 없습니다.':
    'Account and task settings alone provide insufficient evidence of actual network resource access.',
  '같은 실행 계정에서 지정한 자원 접근 결과를 별도 수집하세요.':
    'Capture access results for the specified resource under the same execution account.',
  '업무 스크립트와 네트워크 접근 테스트를 실행하지 않았습니다.':
    'Business-script execution and network-access test results were not collected.',
  '동적으로 조합한 대상 경로는 정적 분석 범위 밖입니다.':
    'Dynamically constructed target paths require further inspection.',
  '수동 실행 기준': 'Manual execution context',
  '기존 셸에서 수집': 'Captured from an existing shell',
  '접근 확인': 'Access verified',
  '예약 실행 기준': 'Scheduled execution context',
  '별도 진단 작업에서 수집': 'Captured by a separate diagnostic task',
  '이전 실행 기준': 'Previous execution context',
  '기준 스냅샷에서 가져옴': 'Imported from a baseline snapshot',
  '해당 없음': 'Not applicable',
  '선택한 폴더에서 수집했습니다. 실행 결과와 대상 계정의 접근 권한은 미확인입니다.':
    'Collected from the selected folder. Execution results and target-account access are unknown.',
  '직접 참조 미발견': 'No direct task reference observed',
  '읽을 수 있었던 예약 작업의 명시적인 참조에서 이 파일을 찾지 못했습니다. 동적 호출, 외부 도구, 수집 제한이 있을 수 있으므로 미사용 파일로 판단하지 않습니다.':
    'This file was absent from the direct references of readable tasks. Dynamic calls, other tools, and collection limits may affect the result.',
  '연결된 작업 설정과 해시를 확인하고, 실행 환경 프로브로 수동·예약 조건을 별도로 수집하세요.':
    'Review linked task settings and hashes, then capture manual and scheduled runtime conditions separately.',
  '예약 작업 참조 미수집': 'Task references outside the collection scope',
  '이 스크립트는 파일 메타데이터와 SHA-256만 수집하는 범위에 포함됩니다.':
    'Collection for this script covers file metadata and SHA-256.',
  '파일 경로와 수집된 해시를 확인하세요.': 'Review the file path and captured hash.',
  '예약 작업 직접 참조 확인': 'Direct scheduled-task reference observed',
  '예약 작업의 실행 설정에서 이 스크립트의 명시적인 참조를 확인했습니다. 계정과 작업 폴더는 저장된 설정이며 실제 실행 환경의 수집 결과가 아닙니다.':
    'The task configuration explicitly references this script. The account and working directory are saved settings. Capture runtime conditions separately.',
  '선택한 폴더에서 파일 메타데이터를 읽었습니다. 원본 스크립트는 실행하지 않았습니다.':
    'File metadata was read from the selected folder during a read-only collection.',
  '확인 필요': 'Needs review',
  '특이사항 없음': 'No issues observed',
  미확인: 'Unknown',
  '원인 후보': 'Possible cause',
  '직접 관측': 'Observed',
  '점검 결과를 열지 못했습니다. 앱을 다시 실행하거나 다른 스냅샷을 가져오세요.':
    'Could not load the workspace. Restart the app or open another snapshot.',
  '로컬 수집 결과를 표시했습니다. 수집 범위와 제한을 확인하세요.':
    'Local collection is ready. Review its scope and limits.',
  '수집을 중단하고 확보한 결과를 표시했습니다.':
    'Collection stopped. Available results have been retained.',
  '수집하지 못했습니다. 일반 로컬 고정 디스크의 폴더인지, 현재 계정으로 읽을 수 있는지 확인하세요.':
    'Collection failed. Check the selected folder and your read permissions.',
  '중단 요청을 전달하지 못했습니다. 현재 읽기 작업이 끝날 때까지 기다려 주세요.':
    'Could not request cancellation. Wait for the current read to finish.',
  '스냅샷을 가져왔습니다.': 'Snapshot imported.',
  '스냅샷을 열지 못했습니다. 지원 형식과 파일 크기를 확인하세요.':
    'Could not open the snapshot. Check its format and file size.',
  '스냅샷을 저장했습니다. 호스트명과 계정이 포함된 내부용 파일입니다.':
    'Snapshot saved. This internal file contains host names and accounts.',
  '파일을 저장하지 못했습니다. 저장 위치와 쓰기 권한을 확인하세요.':
    'Could not save the file. Check the location and write permissions.',
  '합성 예제를 불러왔습니다.': 'Sample workspace loaded.',
  '예제를 불러오지 못했습니다.': 'Could not load the sample workspace.',
  '환경 비교': 'Environment comparison',
  '점검 개요': 'Overview',
  'WinScript Doctor 홈': 'WinScript Doctor home',
  작업공간: 'Workspace',
  '현재 스냅샷': 'Current snapshot',
  '스냅샷 없음': 'No snapshot',
  '결과를 가져오세요': 'Open a snapshot to start',
  '예제 불러오기': 'Load sample',
  '로컬 데이터 처리': 'Local data processing',
  '결과를 외부로 전송하지 않습니다.': 'Snapshots are processed on this device.',
  'Windows 스크립트 진단': 'Automation script inspection',
  '주 메뉴': 'Main navigation',
  '로컬 작업공간': 'Local workspace',
  '어두운 테마로 전환': 'Switch to dark theme',
  '밝은 테마로 전환': 'Switch to light theme',
  '테마 전환': 'Toggle theme',
  '서버 연결': 'Server connections',
  도움말: 'Help',
  '오류 닫기': 'Dismiss error',
  '실행 환경 비교': 'Execution environments',
  '스크립트 상태 점검': 'Script health',
  '운영 스크립트 점검': 'Script inventory',
  '수동 기준과 예약 실행에서 무엇이 달라졌는지 확인하세요.':
    'Compare the conditions captured for manual and scheduled runs.',
  '스크립트와 예약 작업의 실행 조건을 함께 확인하세요.':
    'Inspect your scripts, scheduled tasks, and execution evidence.',
  '로컬 수집': 'Collect locally',
  '결과 저장': 'Save snapshot',
  '스냅샷 열기': 'Open snapshot',
  수집: 'collected',
  '가져온 스냅샷': 'Imported snapshot',
  '합성 예제': 'Sample data',
  '스냅샷을 열어 시작하세요': 'Open a snapshot to get started',
  '저장된 JSON 파일을 가져오거나 합성 예제를 불러올 수 있습니다.':
    'Import a saved JSON snapshot or explore the sample workspace.',
  '점검 결과를 불러오고 있습니다': 'Loading workspace',
  '브라우저 미리보기': 'Browser preview',
  'Wails 데스크톱': 'Wails desktop',
  '저장된 스냅샷 기반 · 실시간 상태가 아닙니다': 'Saved snapshot · collected at the time shown',
  '예제 데이터 · 실제 서버를 점검한 결과가 아닙니다': 'Sample workspace · synthetic server data',
  '알림 닫기': 'Dismiss notification',
  '점검 결과를 읽는 방법': 'Reading the results',
  '관측한 차이와 장애 원인 후보를 구분합니다.':
    'Each result distinguishes observed differences from possible causes.',
  '수집된 두 값 사이에 실제 차이가 있습니다.':
    'A difference was observed between two captured values.',
  '관측한 차이가 실패와 관련 있는지 추가 확인이 필요합니다.':
    'Further investigation is needed to connect this difference to a failure.',
  '정보가 수집되지 않았거나 대상 계정에서 검증하지 않았습니다.':
    'The information was not collected or verified for the target account.',
  '데스크톱 앱에서 로컬 파일을 읽거나 저장된 결과를 열 수 있습니다. Windows에서는 예약 작업 설정도 읽습니다. 예약 작업 설정은 실제 실행 환경 관측값과 구분합니다. 운영 스크립트 실행과 자동 수정은 수행하지 않습니다.':
    'The desktop app reads selected local files and saved snapshots. Windows collection also reads scheduled-task settings. Task settings describe configuration. Runtime observations require separate evidence.',
  '로컬 스크립트 수집': 'Collect local scripts',
  '선택한 폴더에서 스크립트 파일을 찾고 SHA-256을 계산합니다.':
    'Find scripts in a selected folder and calculate their SHA-256 hashes.',
  'PS1·BAT·CMD·SH·BASH 파일을 읽습니다. Windows에서는 읽기 가능한 예약 작업의 PowerShell·BAT·CMD 직접 참조도 연결합니다.':
    'Reads PS1, BAT, CMD, SH, and BASH files. On Windows, readable scheduled tasks can be linked through direct PowerShell and Batch references.',
  '최대 500개 파일을 수집하며 파일당 16 MiB까지 해시를 읽습니다. 링크는 제외합니다. Windows에서 네트워크 공유는 서버 연결 메뉴를 사용하세요.':
    'Collects up to 500 files and hashes up to 16 MiB per file. Linked paths are skipped. Use Server connections for Windows network shares.',
  '로컬 수집은 데스크톱 앱에서 사용할 수 있습니다. 이 환경에서는 저장된 스냅샷을 열어 비교할 수 있습니다.':
    'Local collection is available in the desktop app. You can open and compare saved snapshots in this browser.',
  '폴더를 선택하면 수집합니다. 파일과 예약 작업을 읽는 중입니다.':
    'Select a folder to collect its files and available task settings.',
  '현재 읽기 작업이 끝나면 중단하고 부분 결과를 보존합니다.':
    'Stopping after the current read and retaining partial results.',
  닫기: 'Close',
  '폴더 선택 후 수집': 'Choose folder and collect',
  '수집 중단': 'Stop collection',
  '범위 내 수집 완료': 'Collection complete',
  '부분 수집': 'Partial collection',
  '중단한 수집': 'Collection stopped',
  '읽기 완료': 'Read complete',
  '일부 읽기 실패': 'Some reads failed',
  '읽기 미완료': 'Read unavailable',
  '이 환경에서는 수집하지 않음': "Outside this platform's collection scope",
  '선택한 범위의 파일과 작업 설정입니다. 실행 성공 여부와 실제 실행 환경은 미확인입니다.':
    'These observations cover the selected files and task settings. Execution outcomes and runtime conditions require separate evidence.',
  '수집 범위와 제한': 'Collection scope and limits',
  '점검 대상 스크립트': 'Scripts collected',
  '확인이 필요한 스크립트': 'Scripts to review',
  '원인 후보와 미확인 항목 포함': 'Includes possible causes and unknowns',
  '수집된 환경 비교': 'Environment pairs',
  '수동 기준과 예약 실행의 비교 자료': 'Captured manual and scheduled contexts',
  '스크립트 목록': 'Script inventory',
  '파일과 연결된 예약 작업을 확인하세요.': 'Browse files and their linked scheduled tasks.',
  '스크립트 검색': 'Search scripts',
  '스크립트, 작업 이름으로 검색': 'Search scripts or task names',
  '검색 초기화': 'Clear search',
  '아래 필터로 목록을 좁힐 수 있습니다.': 'Use the filters to narrow the inventory.',
  전체: 'All',
  '스크립트 필터': 'Script filters',
  스크립트: 'Script',
  '예약 작업': 'Scheduled task',
  상태: 'Status',
  '최근 실행': 'Last run',
  '연결 미확인': 'No observed link',
  '검색 결과가 없습니다': 'No matching scripts',
  '다른 검색어나 필터로 다시 확인하세요.': 'Try another search term or filter.',
  '행을 선택하면 진단 근거를 볼 수 있습니다': 'Select a script to inspect its evidence',
  '진단 근거': 'Evidence',
  '진단 상세': 'Script details',
  '스크립트를 선택하세요': 'Select a script',
  '목록에서 항목을 선택하면 근거가 표시됩니다.': 'Choose an inventory item to see its evidence.',
  '파일 위치': 'File location',
  '미수집 · 수집 제한과 실패를 확인하세요': 'Unavailable · review collection limits and failures',
  '저장된 설정입니다. 실제 실행 환경은 별도 수집이 필요합니다.':
    'Saved task settings. Runtime conditions require a separate capture.',
  '작업 / 동작': 'Task / action',
  '실행 파일': 'Executable',
  '작업 폴더': 'Working directory',
  '명시되지 않음': 'Not specified',
  '설정 계정': 'Configured account',
  '로그온 방식': 'Logon type',
  '최근 결과 코드': 'Last result code',
  '확인할 진단': 'Findings',
  '등록된 진단 항목이 없습니다': 'No recorded findings',
  '현재 스냅샷에 기록된 결과입니다.': 'Results recorded in the current snapshot.',
  '이 작업의 환경 비교': 'Compare this task',
  '선택한 스크립트 진단': 'Selected script details',
  '관측한 차이는 원인을 좁히는 단서입니다. 실제 실행 계정에서 확인하지 못한 항목은 미확인으로 남깁니다.':
    'Observed differences help focus an investigation. Values unverified under the execution account remain unknown.',
  '확인 근거': 'Evidence details',
  '다음 확인': 'Next check',
  '비교할 환경 정보가 없습니다': 'No environment pairs available',
  '수동 기준과 예약 실행 정보가 포함된 스냅샷을 가져오세요.':
    'Open a snapshot containing manual and scheduled execution contexts.',
  '비교할 작업': 'Task to compare',
  '좌우 바꾸기': 'Swap sides',
  '값이 다른 항목과 아직 확인하지 못한 항목을 구분합니다.':
    'Review differences alongside values that still need to be captured.',
  차이: 'Differences',
  '전체 항목': 'All fields',
  차이만: 'Differences only',
  '환경 비교 필터': 'Comparison filters',
  '비교 항목': 'Field',
  판정: 'Result',
  동일: 'Same',
  '차이 있음': 'Different',
  '해당하는 비교 항목이 없습니다': 'No fields match this filter',
  '전체 항목에서 다른 값을 확인할 수 있습니다.': 'Select All fields to review the other values.',
  '환경을 비교하지 못했습니다': 'Could not compare environments',
  '스냅샷을 다시 가져오거나 다른 작업을 선택하세요.':
    'Open the snapshot again or select another task.',
  '실행 환경을 비교하고 있습니다': 'Comparing execution environments',
  '실행 환경 비교 결과': 'Execution environment results',
  '수집 근거 자세히': 'View capture details',
  '환경 차이만으로 장애 원인을 확정하지 않습니다. 미확인 항목은 차이 건수에 포함하지 않습니다.':
    'Differences are investigation evidence. Unknown fields are counted separately.',
  '수집 근거': 'Capture details',
  '두 환경의 수집 방식과 시각을 함께 확인하세요.':
    'Review how and when both contexts were captured.',
  수집됨: 'Captured',
  '실행 계정 미확인': 'Execution account unknown',
  '지원하는 스냅샷 JSON 파일인지 확인하세요. 최대 크기는 2 MiB입니다.':
    'Choose a supported snapshot JSON file, up to 2 MiB.',
  'WinScript Doctor의 JSON 스냅샷을 가져옵니다. 파일은 외부로 전송되지 않습니다.':
    'Import a WinScript Doctor JSON snapshot for local inspection.',
  '스냅샷 JSON 파일': 'Snapshot JSON file',
  'JSON 파일 선택': 'Choose JSON file',
  '파일을 확인하고 있습니다': 'Checking file',
  'schemaVersion 1 · 최대 2 MiB': 'schemaVersion 1 or 2 · up to 2 MiB',
  취소: 'Cancel',
  가져오기: 'Import',
  '업데이트를 확인할 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.':
    'Could not check for updates. Check your internet connection and try again.',
  '다운로드를 열 수 없습니다. 다시 시도하세요.': 'Could not open the download. Try again.',
  '업데이트 확인': 'Check for updates',
  '새 업데이트가 있습니다': 'An update is available',
  '이 버전 다시 보지 않기': 'Skip this version',
  확인: 'OK',
  나중에: 'Later',
  '업데이트 파일 받기': 'Download update',
  '연결 성공 · 공유 폴더 목록을 읽었습니다': 'Connected · share directory is readable',
  '파일 읽기 성공': 'File is readable',
  '접근 거부 · 현재 Windows 세션의 인증과 읽기 권한을 확인하세요':
    'Access denied · check authentication and read permissions for this Windows session',
  '공유 폴더 또는 파일을 찾지 못했습니다': 'Share or file not found',
  '경로를 읽지 못했습니다 · 서버 상태와 공유 경로를 확인하세요':
    'Could not read the path · check the server and share',
  '일반 파일을 지정하세요': 'Select a regular file',
  '검사 중 파일이 바뀌었습니다 · 다시 확인하세요': 'File changed during inspection · check again',
  '파일이 16 MiB를 초과하여 해시 계산을 중단했습니다': 'File exceeds the 16 MiB hashing limit',
  '이전 검사에 대한 Windows 응답을 기다리는 중입니다':
    'Waiting for Windows to finish the previous check',
  '10초 안에 검사 응답을 받지 못했습니다': 'No check result was received within 10 seconds',
  '서버 파일 SHA-256': 'Server file SHA-256',
  '서버 목록을 이 앱에 저장하지 못했습니다': 'Could not save the server list in this app',
  '서버 별칭과 등록 한도 40개를 확인하세요': 'Check the server alias and the limit of 40 shares',
  '이미 등록된 별칭 또는 공유 경로입니다': 'This alias or share path is already registered',
  '공유 경로를 \\\\서버\\공유 형식으로 확인하세요':
    'Check the share path using the \\\\server\\share format',
  '공유 경로를 확인한 뒤 연결 테스트를 다시 시도하세요':
    'Check the share path and try the connection test again',
  '신뢰하는 SMB 공유를 등록하세요. 테스트할 때 현재 Windows 세션으로 접속합니다.':
    'Register a trusted SMB share. Tests connect using your current Windows session.',
  '서버 별칭': 'Server alias',
  '공유 폴더': 'Share folder',
  '공유 등록': 'Add share',
  '연결 테스트': 'Test connection',
  '연결 확인 중…': 'Testing connection…',
  삭제: 'Remove',
  '등록된 서버 공유': 'Registered server shares',
  '공유 폴더 기준의 상대 경로와 앱 저장소를 확인하세요':
    'Check the share-relative file path and app storage',
  '파일 검사를 시작하지 못했습니다 · 공유와 파일 경로를 확인하세요':
    'Could not start inspection · check the share and file path',
  '파일 연결을 삭제하지 못했습니다': 'Could not remove the file link',
  '서버 파일 연결': 'Server file link',
  '공유 등록하기': 'Register a share',
  '서버 공유': 'Server share',
  '공유 선택': 'Select a share',
  '공유 기준 파일 경로': 'Share-relative file path',
  '파일 연결': 'Link file',
  '등록에서 삭제된 공유입니다': 'This share has been removed',
  '읽기·SHA-256 확인': 'Check access and SHA-256',
  '파일 확인 중…': 'Inspecting file…',
  '연결 해제': 'Unlink',
  '폴더 또는 파일 읽기 실패': 'Folder or file read failed',
  '메타데이터 형식·길이 제한': 'Metadata format or length limit',
  '파일 해시 읽기 실패': 'File hashing failed',
  '수집 중 파일 변경': 'File changed during collection',
  '폴더 탐색 항목 수 제한': 'Directory entry limit',
  '스크립트 수 제한': 'Script count limit',
  '전체 해시 읽기 용량 제한': 'Total hashing budget reached',
  '파일별 해시 용량 제한': 'Per-file hashing limit',
  '링크·재분석 지점 제외': 'Links and reparse points skipped',
  '예약 작업 일부 조회 실패': 'Some scheduled tasks could not be read',
  '예약 작업 탐색 범위 제한': 'Scheduled-task scope limit',
  '동적·지원하지 않는 스크립트 호출': 'Dynamic or unsupported script invocation',
  '파일별 예약 작업 참조 수 제한': 'Per-script task-reference limit',
  '저장 크기에 따른 항목 제외': 'Items excluded to fit the snapshot size limit',
  '수집 시간 제한': 'Collection time limit',
  '실행 계정': 'Execution account',
  '실행 엔진': 'Execution engine',
  '엔진 버전': 'Engine version',
  '프로세스 비트 수': 'Process architecture',
  '모듈 검색 경로': 'Module search paths',
  '네트워크 자원 접근': 'Network resource access',
  '수집한 값이 일치합니다. 이 항목만으로 업무 실행의 성공을 보장하지 않습니다.':
    'The captured values match. Additional evidence is needed to establish execution success.',
  '한쪽 이상의 값이 미확인입니다. 같은 실행 계정과 조건에서 추가 수집이 필요합니다.':
    'At least one value is unknown. Capture more evidence under the same account and conditions.',
  '실행 계정의 차이를 관측했습니다. 대상 계정의 실제 접근 권한은 별도로 확인하세요.':
    "Different execution accounts were observed. Verify the target account's access separately.",
  '로그온 방식의 차이를 관측했습니다. 해당 방식의 네트워크 접근 조건을 확인하세요.':
    'Different logon types were observed. Check their network access conditions.',
  '실행 파일의 차이를 관측했습니다. 버전과 호환성을 함께 확인하세요.':
    'Different executables were observed. Check their versions and compatibility.',
  '실행 엔진의 버전이 다릅니다. 스크립트와 모듈의 지원 버전을 확인하세요.':
    'Engine versions differ. Check supported script and module versions.',
  '프로세스 비트 수의 차이를 관측했습니다. 사용하는 모듈과 외부 프로그램을 확인하세요.':
    'Process architectures differ. Check the modules and external programs in use.',
  '작업 폴더가 다릅니다. 상대 경로 사용 여부를 확인하세요. 차이만으로 장애 원인을 확정하지 않습니다.':
    'Working directories differ. Check how the script uses relative paths.',
  '모듈 검색 경로나 우선순위가 다릅니다. 모듈 설치와 Import 성공 여부는 별도 확인이 필요합니다.':
    'Module search paths or their order differ. Verify installation and import results separately.',
  '수집된 접근 결과가 다릅니다. 동일한 대상 자원과 계정으로 수집했는지 확인하세요.':
    'Captured access results differ. Check that the same resource and account were used.',
  설정: 'Settings',
  언어: 'Language',
  '앱에서 사용할 표시 언어를 선택하세요.': 'Choose the language used in the app.',
  '영어가 기본 언어입니다. 선택한 언어는 이 기기에 저장됩니다.':
    'English is the default. Your selection is saved on this device.',
  '화면 모드': 'Appearance',
  밝게: 'Light',
  어둡게: 'Dark',
  '설정을 저장하지 못했습니다. 앱 저장소에 접근할 수 있는지 확인하세요.':
    'Could not save settings. Check access to the app storage.',
  버전: 'Version',
  '파일·공유 연결과 언어 설정은 이 기기에 보관됩니다.':
    'File links, registered shares, and language preferences are stored on this device.',
  '파일 {count}개': '{count} files',
  '{field} 수집 근거': '{field} capture details',
  '예약 작업 설정 {count}개': '{count} scheduled-task settings',
  '{count}개 표시 / 전체 {total}개': 'Showing {count} of {total}',
  '스크립트 {scripts}개 · 환경 비교 {pairs}쌍': '{scripts} scripts · {pairs} environment pairs',
  '수집 제한·부분 실패 {count}종류 확인': '{count} collection limits or partial failures',
  '해시 {hashed} / 파일 {files}개 · 예약 작업 {tasks}':
    'Hashes {hashed} / {files} files · scheduled tasks {tasks}',
  '{count}개 조회 · {status}': '{count} inspected · {status}',
  '현재 v{current}입니다. 이 기기에 설치할 새 버전이 없습니다.':
    'You are using v{current}. No newer package is available for this device.',
  '현재 v{current} → 새 버전 v{next}': 'Current v{current} → new v{next}',
  '{file}을 브라우저에서 다운로드합니다. 결과를 저장하고 앱을 닫은 뒤 설치하세요.':
    'Download {file} in your browser. Save your results and close the app before installing.',
}
