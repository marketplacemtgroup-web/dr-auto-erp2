package com.example.data.db

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase

@Entity(tableName = "time_clocks")
data class DbTimeClock(
    @PrimaryKey val id: String,
    val tipo: String,
    val hora: String,
    val status: String,
    val data: String
)

@Entity(tableName = "requests")
data class DbRequest(
    @PrimaryKey val id: String,
    val tipo: String,
    val dataReferencia: String,
    val descricao: String,
    val status: String,
    val createdAt: String
)

@Dao
interface TimeClockDao {
    @Query("SELECT * FROM time_clocks WHERE data = :currData ORDER BY hora ASC")
    suspend fun getTodayClocks(currData: String): List<DbTimeClock>

    @Query("SELECT * FROM time_clocks ORDER BY data DESC, hora DESC")
    suspend fun getAllHistory(): List<DbTimeClock>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClock(clock: DbTimeClock)

    @Query("DELETE FROM time_clocks")
    suspend fun clearAll()
}

@Dao
interface RequestDao {
    @Query("SELECT * FROM requests ORDER BY createdAt DESC")
    suspend fun getAllRequests(): List<DbRequest>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRequest(request: DbRequest)

    @Query("UPDATE requests SET status = 'cancelada' WHERE id = :id")
    suspend fun cancelRequest(id: String)

    @Query("DELETE FROM requests")
    suspend fun clearAll()
}

@Database(entities = [DbTimeClock::class, DbRequest::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun timeClockDao(): TimeClockDao
    abstract fun requestDao(): RequestDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "colaborador_beto_db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
