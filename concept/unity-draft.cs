using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

// ==========================================
// 1. HỆ THỐNG QUẢN LÝ CHUNG (GAME MANAGER)
// ==========================================
public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    [Header("Game Stats")]
    public float timeRemaining = 30f;
    public int score = 0;
    public bool isGameOver = false;

    [Header("UI References")]
    public Text scoreText;
    public Text timeText;
    public GameObject gameOverPanel;

    void Awake()
    {
        if (Instance == null) Instance = this;
    }

    void Update()
    {
        if (isGameOver) return;

        timeRemaining -= Time.deltaTime;
        UpdateUI();

        if (timeRemaining <= 0)
        {
            TriggerGameOver("HẾT THỜI GIAN!");
        }
    }

    public void AddScore(int amount)
    {
        score += amount;
        UpdateUI();
    }

    public void AddTime(float amount)
    {
        timeRemaining += amount;
    }

    void UpdateUI()
    {
        if (scoreText != null) scoreText.text = "SCORE: " + score;
        if (timeText != null) timeText.text = "TIME: " + Mathf.Ceil(timeRemaining) + "s";
    }

    public void TriggerGameOver(string reason)
    {
        isGameOver = true;
        Debug.Log("GAME OVER: " + reason);
        if (gameOverPanel != null) gameOverPanel.SetActive(true);
    }

    public void RestartGame()
    {
        SceneManager.LoadScene(SceneManager.GetActiveScene().name);
    }
}

// ==========================================
// 2. ĐIỀU KHIỂN NHÂN VẬT (PLAYER CONTROLLER)
// ==========================================
public class PlayerController : MonoBehaviour
{
    [Header("Movement Settings")]
    public float moveDistance = 1f;
    public float moveSpeed = 15f;

    public bool isMoving { get; private set; } = false;
    private Vector3 targetPosition;

    public delegate void PlayerMovedAction(int steps);
    public static event PlayerMovedAction OnPlayerMoved;

    void Start()
    {
        targetPosition = transform.position;
    }

    void Update()
    {
        if (GameManager.Instance != null && GameManager.Instance.isGameOver) return;

        HandleInput();
        ProcessMovement();
    }

    void HandleInput()
    {
        if (!isMoving)
        {
            if (Input.GetMouseButtonDown(0)) 
            {
                MoveForward(1);
            }
            else if (Input.GetMouseButtonDown(1) || Input.GetKeyDown(KeyCode.Space))
            {
                MoveForward(2);
            }
        }
    }

    void ProcessMovement()
    {
        if (isMoving)
        {
            transform.position = Vector3.MoveTowards(transform.position, targetPosition, moveSpeed * Time.deltaTime);
            
            if (Vector3.Distance(transform.position, targetPosition) < 0.01f)
            {
                transform.position = targetPosition;
                isMoving = false;
            }

            if (BossController.Instance != null && BossController.Instance.isWatching)
            {
                GameManager.Instance.TriggerGameOver("BẠN ĐÃ BỊ QUẢN TRÒ BẮT!");
            }
        }
    }

    void MoveForward(int steps)
    {
        targetPosition += new Vector3(0, 0, moveDistance * steps);
        isMoving = true;
        
        if (GameManager.Instance != null)
        {
            GameManager.Instance.AddScore(steps);
        }

        OnPlayerMoved?.Invoke(steps);
    }
}

// ==========================================
// 3. ĐIỀU KHIỂN QUẢN TRÒ (BOSS CONTROLLER)
// ==========================================
public class BossController : MonoBehaviour
{
    public static BossController Instance;

    public enum BossState { Counting, Warning, Watching }
    public BossState currentState = BossState.Counting;

    public bool isWatching => currentState == BossState.Watching;

    [Header("Timers")]
    public float minCountTime = 2f;
    public float maxCountTime = 5f;
    public float warningTime = 0.5f;
    public float watchTime = 2f;

    void Awake()
    {
        if (Instance == null) Instance = this;
    }

    void Start()
    {
        StartCoroutine(BossRoutine());
    }

    IEnumerator BossRoutine()
    {
        while (GameManager.Instance == null || !GameManager.Instance.isGameOver)
        {
            currentState = BossState.Counting;
            Debug.Log("Quản trò: 1... 2... 3...");
            yield return new WaitForSeconds(Random.Range(minCountTime, maxCountTime));

            currentState = BossState.Warning;
            Debug.Log("Quản trò chuẩn bị quay lại!");
            yield return new WaitForSeconds(warningTime);

            currentState = BossState.Watching;
            Debug.Log("Quản trò ĐANG NHÌN!");
            yield return new WaitForSeconds(watchTime);
        }
    }
}

// ==========================================
// 4. TẠO BẢN ĐỒ VÔ TẬN (MAP GENERATOR)
// ==========================================
public class MapGenerator : MonoBehaviour
{
    [Header("Prefabs")]
    public GameObject tilePrefab;
    public GameObject treePrefab;
    public GameObject rockPrefab;
    public GameObject holePrefab;

    [Header("Map Settings")]
    public int initialSpawnCount = 20;
    public float tileSize = 1f;
    
    private Queue<GameObject> activeRows = new Queue<GameObject>();
    private float spawnZ = 0f;

    void Start()
    {
        PlayerController.OnPlayerMoved += SpawnNextTiles;

        for (int i = 0; i < initialSpawnCount; i++)
        {
            SpawnTileRow(isSafeZone: i < 5);
        }
    }

    void OnDestroy()
    {
        PlayerController.OnPlayerMoved -= SpawnNextTiles;
    }

    void SpawnNextTiles(int steps)
    {
        for (int i = 0; i < steps; i++)
        {
            SpawnTileRow(isSafeZone: false);
            DeleteOldRow();
        }
    }

    void SpawnTileRow(bool isSafeZone)
    {
        GameObject rowObject = new GameObject("Row_" + spawnZ);
        rowObject.transform.position = new Vector3(0, 0, spawnZ);

        for (int x = -1; x <= 1; x++)
        {
            GameObject prefabToSpawn = tilePrefab;

            if (!isSafeZone)
            {
                float rand = Random.value;
                if (rand < 0.1f) prefabToSpawn = holePrefab;
                else if (rand < 0.2f) prefabToSpawn = rockPrefab;
                else if (rand < 0.35f) prefabToSpawn = treePrefab;
            }

            if (prefabToSpawn != null)
            {
                Vector3 spawnPosition = new Vector3(x * tileSize, 0, spawnZ);
                GameObject currentObj = Instantiate(prefabToSpawn, spawnPosition, Quaternion.identity);
                currentObj.transform.SetParent(rowObject.transform);
            }
        }

        activeRows.Enqueue(rowObject);
        spawnZ += tileSize;
    }

    void DeleteOldRow()
    {
        if (activeRows.Count > initialSpawnCount)
        {
            GameObject oldRow = activeRows.Dequeue();
            Destroy(oldRow);
        }
    }
}